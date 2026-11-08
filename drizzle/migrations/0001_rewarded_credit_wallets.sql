CREATE TABLE public.credit_wallets (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid, guest_hash text, environment text NOT NULL DEFAULT 'test', balance integer NOT NULL DEFAULT 15 CHECK(balance >= 0), created_at timestamptz NOT NULL DEFAULT now(), CHECK ((owner_id IS NULL) <> (guest_hash IS NULL)), UNIQUE(owner_id, environment), UNIQUE(guest_hash, environment)
);
GRANT SELECT ON public.credit_wallets TO authenticated;
GRANT ALL ON public.credit_wallets TO service_role;
ALTER TABLE public.credit_wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_credit_wallet ON public.credit_wallets FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE TABLE public.credit_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), wallet_id uuid NOT NULL REFERENCES public.credit_wallets(id), amount integer NOT NULL, kind text NOT NULL, reference text NOT NULL UNIQUE, status text NOT NULL DEFAULT 'complete', created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.credit_events TO authenticated;
GRANT ALL ON public.credit_events TO service_role;
ALTER TABLE public.credit_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_credit_events ON public.credit_events FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.credit_wallets w WHERE w.id = wallet_id AND w.owner_id = auth.uid()));
CREATE TABLE public.credit_reward_sessions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), wallet_id uuid NOT NULL REFERENCES public.credit_wallets(id), ad_unit text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), rewarded_at timestamptz, transaction_id text UNIQUE
);
GRANT ALL ON public.credit_reward_sessions TO service_role;
ALTER TABLE public.credit_reward_sessions ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.credit_reserve(p_wallet uuid, p_request uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 PERFORM 1 FROM public.credit_wallets WHERE id = p_wallet FOR UPDATE;
 IF EXISTS(SELECT 1 FROM public.credit_events WHERE reference = 'chat:' || p_request::text) THEN RETURN false; END IF;
 UPDATE public.credit_wallets SET balance = balance - 1 WHERE id = p_wallet AND balance >= 1;
 IF NOT FOUND THEN RETURN false; END IF;
 INSERT INTO public.credit_events(wallet_id, amount, kind, reference, status) VALUES(p_wallet, -1, 'answer', 'chat:' || p_request::text, 'pending');
 RETURN true;
END; $$;
REVOKE ALL ON FUNCTION public.credit_reserve(uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_reserve(uuid,uuid) TO service_role;
CREATE FUNCTION public.credit_finish(p_wallet uuid, p_request uuid, p_success boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 PERFORM 1 FROM public.credit_wallets WHERE id = p_wallet FOR UPDATE;
 UPDATE public.credit_events SET status = CASE WHEN p_success THEN 'complete' ELSE 'refunded' END WHERE wallet_id = p_wallet AND reference = 'chat:' || p_request::text AND status = 'pending';
 IF FOUND AND NOT p_success THEN
 UPDATE public.credit_wallets SET balance = balance + 1 WHERE id = p_wallet;
 INSERT INTO public.credit_events(wallet_id, amount, kind, reference) VALUES(p_wallet, 1, 'refund', 'refund:' || p_request::text);
 END IF;
END; $$;
REVOKE ALL ON FUNCTION public.credit_finish(uuid,uuid,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_finish(uuid,uuid,boolean) TO service_role;
CREATE FUNCTION public.credit_reward(p_session uuid, p_transaction text, p_test boolean) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.credit_reward_sessions; env text;
BEGIN
 SELECT * INTO s FROM public.credit_reward_sessions WHERE id = p_session FOR UPDATE;
 IF NOT FOUND THEN RETURN false; END IF;
 IF s.rewarded_at IS NOT NULL THEN RETURN true; END IF;
 IF s.created_at < now() - interval '24 hours' THEN RETURN false; END IF;
 SELECT environment INTO env FROM public.credit_wallets WHERE id = s.wallet_id FOR UPDATE;
 IF p_test AND env <> 'test' THEN RETURN false; END IF;
 IF EXISTS(SELECT 1 FROM public.credit_reward_sessions WHERE transaction_id = p_transaction) THEN RETURN false; END IF;
 UPDATE public.credit_reward_sessions SET rewarded_at = now(), transaction_id = p_transaction WHERE id = p_session;
 UPDATE public.credit_wallets SET balance = balance + 15 WHERE id = s.wallet_id;
 INSERT INTO public.credit_events(wallet_id, amount, kind, reference) VALUES(s.wallet_id, 15, 'reward', 'ad:' || p_transaction);
 RETURN true;
END; $$;
REVOKE ALL ON FUNCTION public.credit_reward(uuid,text,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_reward(uuid,text,boolean) TO service_role;