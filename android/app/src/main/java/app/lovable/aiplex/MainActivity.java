package app.lovable.aiplex;

import android.Manifest;
import android.content.pm.PackageManager;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import androidx.core.app.ActivityCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onStart() {
        super.onStart();
        // Ask for microphone access up front so voice questions work.
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
            != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.RECORD_AUDIO}, 1);
        }
        // Let the WebView use the microphone (voice questions) once the app
        // itself has been granted RECORD_AUDIO.
        getBridge().getWebView().setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                boolean micGranted = ActivityCompat.checkSelfPermission(
                    MainActivity.this, Manifest.permission.RECORD_AUDIO
                ) == PackageManager.PERMISSION_GRANTED;
                if (micGranted) {
                    runOnUiThread(() -> request.grant(request.getResources()));
                } else {
                    runOnUiThread(request::deny);
                }
            }
        });
    }
}
