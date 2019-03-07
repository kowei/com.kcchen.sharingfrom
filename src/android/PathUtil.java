package com.kcchen.sharingfrom;

/**
 * Created by kowei on 2017/4/18.
 */

import android.annotation.SuppressLint;
import android.content.ContentUris;
import android.content.Context;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.DocumentsContract;
import android.provider.MediaStore;
import android.provider.OpenableColumns;
import android.util.Log;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.URISyntaxException;



public class PathUtil {
    /*
     * Gets the file path of the given Uri.
     */
    @SuppressLint("NewApi")
    public static String getPath(Context context, Uri uri) throws URISyntaxException {
        final boolean needToCheckUri = Build.VERSION.SDK_INT >= 19;
        String selection = null;
        String[] selectionArgs = null;
        // Uri is different in versions after KITKAT (Android 4.4), we need to
        // deal with different Uris.
        if (needToCheckUri && DocumentsContract.isDocumentUri(context.getApplicationContext(), uri)) {
            if (isExternalStorageDocument(uri)) {
                final String docId = DocumentsContract.getDocumentId(uri);
                final String[] split = docId.split(":");
                return Environment.getExternalStorageDirectory() + "/" + split[1];
            } else if (isDownloadsDocument(uri)) {
                final String id = DocumentsContract.getDocumentId(uri);
                uri = ContentUris.withAppendedId(
                        Uri.parse("content://downloads/public_downloads"), Long.valueOf(id));
            } else if (isMediaDocument(uri)) {
                final String docId = DocumentsContract.getDocumentId(uri);
                final String[] split = docId.split(":");
                final String type = split[0];
                if ("image".equals(type)) {
                    uri = MediaStore.Images.Media.EXTERNAL_CONTENT_URI;
                } else if ("video".equals(type)) {
                    uri = MediaStore.Video.Media.EXTERNAL_CONTENT_URI;
                } else if ("audio".equals(type)) {
                    uri = MediaStore.Audio.Media.EXTERNAL_CONTENT_URI;
                }
                selection = "_id=?";
                selectionArgs = new String[]{ split[1] };
            }
        }

        if ("content".equalsIgnoreCase(uri.getScheme())) {
            Cursor cursor = null;
            try {
                if (!isChromeResource(uri)) {
                    String[] projection = { MediaStore.Images.Media.DATA };
                    cursor = context.getContentResolver().query(uri, projection, selection, selectionArgs, null);

                    if (cursor != null && cursor.moveToFirst()) {
                        int column_index = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.DATA);
                        return cursor.getString(column_index);
                    }
                } else {
                    String[] projection = { OpenableColumns.DISPLAY_NAME };
                    cursor = context.getContentResolver().query(uri, projection, null, null, null);

                    if (cursor != null && cursor.moveToFirst()) {
                        return extractPathByTempFile(context, cursor, uri);
                    }
                }
            } catch (Exception e) {
                String[] projection = { OpenableColumns.DISPLAY_NAME };
                cursor = context.getContentResolver().query(uri, projection, null, null, null);

                if (cursor != null && cursor.moveToFirst()) {
                    return extractPathByTempFile(context, cursor, uri);
                }
            } finally {
                if (cursor != null) {
                    cursor.close();
                }
            }
        } else if ("file".equalsIgnoreCase(uri.getScheme())) {
            return uri.getPath();
        }
        return null;
    }

    public static String extractPathByTempFile(Context context, Cursor cursor, Uri uri) {
        try {
            int column_index = cursor.getColumnIndexOrThrow(OpenableColumns.DISPLAY_NAME);
            File tempFile = new File(context.getExternalCacheDir(), cursor.getString(column_index));

            InputStream inputStream = null;
            try {
                inputStream = context.getContentResolver().openInputStream(uri);
                OutputStream outputStream = null;
                try {
                    outputStream = new FileOutputStream(tempFile);
                    byte[] buffer = new byte[4 * 1024];
                    int read;
                    while ((read = inputStream.read(buffer)) != -1) {
                        outputStream.write(buffer, 0, read);
                    }
                    outputStream.flush();
                } finally {
                    if (outputStream != null) {
                        outputStream.close();
                    }
                }
            } finally {
                if (inputStream != null) {
                    inputStream.close();
                }
            }
            return tempFile.getAbsolutePath();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return null;
    }


    /**
     * @param uri The Uri to check.
     * @return Whether the Uri authority is ExternalStorageProvider.
     */
    public static boolean isExternalStorageDocument(Uri uri) {
        return "com.android.externalstorage.documents".equals(uri.getAuthority());
    }

    /**
     * @param uri The Uri to check.
     * @return Whether the Uri authority is DownloadsProvider.
     */
    public static boolean isDownloadsDocument(Uri uri) {
        return "com.android.providers.downloads.documents".equals(uri.getAuthority());
    }

    /**
     * @param uri The Uri to check.
     * @return Whether the Uri authority is MediaProvider.
     */
    public static boolean isMediaDocument(Uri uri) {
        return "com.android.providers.media.documents".equals(uri.getAuthority());
    }

    /**
     * @param uri The Uri to check.
     * @return Whether the Uri authority is ChromeFileProvider.
     */
    public static boolean isChromeResource(Uri uri) {
        return "com.android.chrome.FileProvider".equals(uri.getAuthority());
    }
}