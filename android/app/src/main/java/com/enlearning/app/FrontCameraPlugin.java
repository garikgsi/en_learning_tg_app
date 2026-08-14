package com.enlearning.app;

import android.app.Activity;
import android.content.Intent;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "FrontCamera")
public class FrontCameraPlugin extends Plugin {
    @PluginMethod
    public void takePhoto(PluginCall call) {
        startActivityForResult(call, new Intent(getContext(), FrontCameraActivity.class), "photoResult");
    }

    @ActivityCallback
    private void photoResult(PluginCall call, ActivityResult result) {
        if (call == null) {
            return;
        }

        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) {
            call.reject("Съёмка отменена");
            return;
        }

        String path = result.getData().getStringExtra(FrontCameraActivity.EXTRA_PATH);
        if (path == null) {
            call.reject("Не удалось получить фотографию");
            return;
        }

        JSObject response = new JSObject();
        response.put("path", "file://" + path);
        call.resolve(response);
    }
}
