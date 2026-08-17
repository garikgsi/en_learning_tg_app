package com.enlearning.app;

import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageInfo;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.activity.result.ActivityResult;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URL;
import java.security.MessageDigest;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "AppUpdate")
public class AppUpdatePlugin extends Plugin {

    private static final long MAX_APK_SIZE = 250L * 1024L * 1024L;
    private static final int MAX_REDIRECTS = 5;
    private final ExecutorService downloadExecutor = Executors.newSingleThreadExecutor();

    @PluginMethod
    public void getCurrentVersion(PluginCall call) {
        try {
            PackageInfo packageInfo = getContext().getPackageManager().getPackageInfo(getContext().getPackageName(), 0);
            long versionCode = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P
                ? packageInfo.getLongVersionCode()
                : packageInfo.versionCode;
            JSObject result = new JSObject();
            result.put("versionCode", versionCode);
            result.put("versionName", packageInfo.versionName == null ? "" : packageInfo.versionName);
            call.resolve(result);
        } catch (Exception exception) {
            call.reject("Не удалось определить установленную версию", "VERSION_READ_FAILED", exception);
        }
    }

    @PluginMethod
    public void downloadAndInstall(PluginCall call) {
        String url = call.getString("url");
        String sha256 = call.getString("sha256");
        Long expectedSize = call.getLong("size");

        if (url == null || sha256 == null || !sha256.matches("(?i)^[a-f0-9]{64}$")) {
            call.reject("Некорректные параметры обновления", "INVALID_UPDATE");
            return;
        }

        String normalizedSha256 = sha256.toLowerCase(Locale.ROOT);

        downloadExecutor.execute(() -> {
            try {
                File apk = download(url, normalizedSha256, expectedSize);
                getBridge().executeOnMainThread(() -> continueInstallation(call, apk));
            } catch (Exception exception) {
                getBridge().executeOnMainThread(() -> call.reject(
                    "Не удалось скачать обновление",
                    "DOWNLOAD_FAILED",
                    exception
                ));
            }
        });
    }

    private File download(String source, String expectedSha256, Long expectedSize) throws Exception {
        URL url = URI.create(source).toURL();
        validateUrl(url);
        HttpURLConnection connection = openConnection(url);
        long contentLength = connection.getContentLengthLong();

        if (contentLength > MAX_APK_SIZE || (expectedSize != null && expectedSize > MAX_APK_SIZE)) {
            connection.disconnect();
            throw new IllegalArgumentException("Файл обновления слишком большой");
        }

        File directory = new File(getContext().getCacheDir(), "app-updates");

        if (!directory.exists() && !directory.mkdirs()) {
            connection.disconnect();
            throw new IllegalStateException("Не удалось подготовить каталог обновлений");
        }

        File temporary = new File(directory, "update.apk.part");
        File destination = new File(directory, "update-" + expectedSha256.substring(0, 16) + ".apk");
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        long downloaded = 0;

        try (
            InputStream input = connection.getInputStream();
            FileOutputStream output = new FileOutputStream(temporary)
        ) {
            byte[] buffer = new byte[64 * 1024];
            int count;

            while ((count = input.read(buffer)) != -1) {
                downloaded += count;

                if (downloaded > MAX_APK_SIZE) {
                    throw new IllegalArgumentException("Файл обновления слишком большой");
                }

                digest.update(buffer, 0, count);
                output.write(buffer, 0, count);
            }
        } finally {
            connection.disconnect();
        }

        String actualSha256 = bytesToHex(digest.digest());

        if (!actualSha256.equals(expectedSha256)) {
            temporary.delete();
            throw new SecurityException("Контрольная сумма обновления не совпадает");
        }

        if (expectedSize != null && expectedSize > 0 && downloaded != expectedSize) {
            temporary.delete();
            throw new SecurityException("Размер обновления не совпадает");
        }

        if (destination.exists() && !destination.delete()) {
            temporary.delete();
            throw new IllegalStateException("Не удалось заменить ранее скачанное обновление");
        }

        if (!temporary.renameTo(destination)) {
            temporary.delete();
            throw new IllegalStateException("Не удалось сохранить обновление");
        }

        return destination;
    }

    private HttpURLConnection openConnection(URL initialUrl) throws Exception {
        URL currentUrl = initialUrl;

        for (int redirect = 0; redirect <= MAX_REDIRECTS; redirect++) {
            validateUrl(currentUrl);
            HttpURLConnection connection = (HttpURLConnection) currentUrl.openConnection();
            connection.setConnectTimeout(15_000);
            connection.setReadTimeout(30_000);
            connection.setInstanceFollowRedirects(false);
            connection.setRequestProperty("Accept", "application/vnd.android.package-archive");
            int status = connection.getResponseCode();

            if (status >= 300 && status < 400) {
                String location = connection.getHeaderField("Location");
                connection.disconnect();

                if (location == null || redirect == MAX_REDIRECTS) {
                    throw new IllegalStateException("Некорректное перенаправление обновления");
                }

                currentUrl = new URL(currentUrl, location);
                continue;
            }

            if (status != HttpURLConnection.HTTP_OK) {
                connection.disconnect();
                throw new IllegalStateException("Сервер обновлений вернул HTTP " + status);
            }

            return connection;
        }

        throw new IllegalStateException("Слишком много перенаправлений обновления");
    }

    private void validateUrl(URL url) {
        boolean isDebuggable = (getContext().getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
        boolean validScheme = "https".equalsIgnoreCase(url.getProtocol())
            || (isDebuggable && "http".equalsIgnoreCase(url.getProtocol()));

        if (!validScheme) {
            throw new SecurityException("Обновления разрешено скачивать только по HTTPS");
        }
    }

    private String bytesToHex(byte[] bytes) {
        StringBuilder result = new StringBuilder(bytes.length * 2);

        for (byte value : bytes) {
            result.append(String.format(Locale.ROOT, "%02x", value & 0xff));
        }

        return result.toString();
    }

    private void continueInstallation(PluginCall call, File apk) {
        if (
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            && !getContext().getPackageManager().canRequestPackageInstalls()
        ) {
            Intent settingsIntent = new Intent(
                Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                Uri.parse("package:" + getContext().getPackageName())
            );
            startActivityForResult(call, settingsIntent, "installPermissionResult");
            return;
        }

        launchInstaller(call, apk);
    }

    @ActivityCallback
    private void installPermissionResult(PluginCall call, ActivityResult result) {
        if (
            call == null
            || (
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                && !getContext().getPackageManager().canRequestPackageInstalls()
            )
        ) {
            if (call != null) {
                call.reject("Не разрешена установка обновлений", "INSTALL_PERMISSION_DENIED");
            }
            return;
        }

        String sha256 = call.getString("sha256");

        if (sha256 == null) {
            call.reject("Скачанное обновление не найдено", "UPDATE_NOT_FOUND");
            return;
        }

        File apk = new File(
            new File(getContext().getCacheDir(), "app-updates"),
            "update-" + sha256.substring(0, 16).toLowerCase(Locale.ROOT) + ".apk"
        );

        if (!apk.isFile()) {
            call.reject("Скачанное обновление не найдено", "UPDATE_NOT_FOUND");
            return;
        }

        launchInstaller(call, apk);
    }

    private void launchInstaller(PluginCall call, File apk) {
        try {
            Uri contentUri = FileProvider.getUriForFile(
                getContext(),
                getContext().getPackageName() + ".updates",
                apk
            );
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(contentUri, "application/vnd.android.package-archive");
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception exception) {
            call.reject("Не удалось открыть установщик Android", "INSTALLER_FAILED", exception);
        }
    }

    @Override
    protected void handleOnDestroy() {
        downloadExecutor.shutdownNow();
    }
}
