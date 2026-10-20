package io.github.hollywoodenspoon.cardmaker;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Project folders (see FoldersPlugin and src/platform/android.ts).
        registerPlugin(FoldersPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
