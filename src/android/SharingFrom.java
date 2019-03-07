package com.kcchen.sharingfrom;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.text.Html;
import android.util.Log;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaActivity;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CordovaResourceApi;
import org.apache.cordova.PluginResult;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

/**
 * SharingFrom is a PhoneGap plugin that bridges Android intents and web
 * applications:
 * <p>
 * 1. web apps can spawn intents that call native Android applications. 2.
 * (after setting up correct intent filters for PhoneGap applications), Android
 * intents can be handled by PhoneGap web applications.
 *
 * @author boris@borismus.com
 */
public class SharingFrom extends CordovaPlugin {
    private final static String TAG = SharingFrom.class.getSimpleName();
    private final static String INTENT_MIME = "MIME";
    private final static String INTENT_URL = "URL";
    private final static String INTENT_FILE = "FILE";

    private CallbackContext onNewIntentCallbackContext = null;
    private Intent shareIntent = null;

    /**
     * @param action          The action to execute.
     * @param args            The exec() arguments.
     * @param callbackContext The callback context used when calling back into JavaScript.
     * @return true: comsume  false: reject if using Promise
     */
    @Override
    public boolean execute(String action, JSONArray args, CallbackContext callbackContext) {
        try {
            Log.i(TAG, "execute " + "action:" + action + " args:" + args + " callbackContext:" + callbackContext);
            if (action.equals("startActivity")) {
                if (args.length() != 1) {
                    //return new PluginResult(PluginResult.Status.INVALID_ACTION);
                    callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.INVALID_ACTION));
                    return false;
                }

                // Parse the arguments
                final CordovaResourceApi resourceApi = webView.getResourceApi();
                JSONObject obj = args.getJSONObject(0);
                String type = obj.has("type") ? obj.getString("type") : null;
                Uri uri = obj.has("url") ? resourceApi.remapUri(Uri.parse(obj.getString("url"))) : null;
                JSONObject extras = obj.has("extras") ? obj.getJSONObject("extras") : null;
                Map<String, String> extrasMap = new HashMap<String, String>();

                // Populate the extras if any exist
                if (extras != null) {
                    JSONArray extraNames = extras.names();
                    for (int i = 0; i < extraNames.length(); i++) {
                        String key = extraNames.getString(i);
                        String value = extras.getString(key);
                        extrasMap.put(key, value);
                    }
                }

                startActivity(obj.getString("action"), uri, type, extrasMap);
                //return new PluginResult(PluginResult.Status.OK);
                callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.OK));
                return true;

            } else if (action.equals("hasExtra")) {
                if (args.length() != 1) {
                    //return new PluginResult(PluginResult.Status.INVALID_ACTION);
                    callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.INVALID_ACTION));
                    Log.i(TAG, "hasExtra exit");
                    return false;
                }
                Intent i = ((CordovaActivity) this.cordova.getActivity()).getIntent();
                String extraName = args.getString(0);
                //return new PluginResult(PluginResult.Status.OK, i.hasExtra(extraName));
                Log.i(TAG, "hasExtra finished:" + i + " extraName:" + extraName);
                callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.OK, i.hasExtra(extraName)));
                return true;
            } else if (action.equals("clearIntent")) {

                /*Intent intent = ((CordovaActivity) this.cordova.getActivity()).getIntent();
                if (callbackContext == null) {
                    Log.e(TAG, "getIntentFiles Callback not valid");
                    return false;
                }
                if (intent == null) {
                    callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.OK, "Intent is null"));
                    return true;
                }
                final String intentType = intent.getType();

                if (intentType == null) {
                    Log.e(TAG, "getIntentFiles Intent type not valid");
                    callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.OK, "getIntentFiles Intent not for files sharing"));
                    return true;
                } else {
                    ((CordovaActivity) this.cordova.getActivity()).getIntent().removeExtra(Intent.EXTRA_STREAM);
                    ((CordovaActivity) this.cordova.getActivity()).getIntent().removeExtra(Intent.EXTRA_TEXT);
                    callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.OK, "Intent is null"));
                }*/
                shareIntent = null;
                callbackContext.success();
                return true;

            } else if (action.equals("getExtra")) {
                if (args.length() != 1) {
                    Log.i(TAG, "getExtra exit:" + args.length());
                    //return new PluginResult(PluginResult.Status.INVALID_ACTION);
                    callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.INVALID_ACTION));
                    return false;
                }
                Intent intent = ((CordovaActivity) this.cordova.getActivity()).getIntent();
                JSONObject files = new JSONObject();
                JSONArray urls = new JSONArray();
                final String intentType = intent.getType();
                final String intentAction = intent.getAction();
                if (Intent.ACTION_SEND.equals(intentAction) && intentType != null) {
                    Uri imageUri = (Uri) intent.getParcelableExtra(Intent.EXTRA_STREAM);
                    if (imageUri != null) {
                        files.put(Intent.EXTRA_MIME_TYPES, intentType);
                        urls.put(imageUri.getPath());
                        files.put("FILES", urls);
                    }

                } else if (Intent.ACTION_SEND_MULTIPLE.equals(intentAction) && intentType != null) {
                    ArrayList<Uri> imageUris = intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM);
                    if (imageUris != null && imageUris.size() > 0) {
                        files.put(Intent.EXTRA_MIME_TYPES, intentType);
                        for (Uri uri : imageUris
                                ) {
                            urls.put(uri.getPath());
                        }
                        files.put("FILES", urls);
                    }

                } else {
                    Log.e(TAG, "NO handler");
                }
                Log.i(TAG, "getExtra intent:"
                        + " | " + intent
                        + " | " + intentType
                        + " | " + intentAction
                        + " | " + Intent.ACTION_SEND
                        + " | " + files.toString()
                        + " | " + urls.toString()
                );
                String extraName = args.getString(0);
                Log.i(TAG, "getExtra files:" + files.toString());
                if (!files.isNull("FILES")) {
                    //return new PluginResult(PluginResult.Status.OK, i.getStringExtra(extraName));
                    callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.OK, files.toString()));
                    Log.i(TAG, "getExtra getStringExtra:" + files.toString());
                    return true;
                } else {
                    //return new PluginResult(PluginResult.Status.ERROR);
                    callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.ERROR));
                    return false;
                }
            } else if (action.equals("getUri")) {
                if (args.length() != 0) {
                    //return new PluginResult(PluginResult.Status.INVALID_ACTION);
                    callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.INVALID_ACTION));
                    return false;
                }

                Intent i = ((CordovaActivity) this.cordova.getActivity()).getIntent();
                String uri = i.getDataString();
                //return new PluginResult(PluginResult.Status.OK, uri);
                callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.OK, uri));
                return true;

                // onNewIntent
            } else if (action.equals("onNewIntent")) {
                // save reference to the callback; will be called on "new intent" events
                if (onNewIntentCallbackContext != null) {
                    onNewIntentCallbackContext.success();
                }
                onNewIntentCallbackContext = callbackContext;

                shareIntent = cordova.getActivity().getIntent();
                JSONObject data = extractIntentData(shareIntent);

                PluginResult mPluginResult = new PluginResult(PluginResult.Status.OK, data);
                mPluginResult.setKeepCallback(true);
                onNewIntentCallbackContext.sendPluginResult(mPluginResult);

                return true;
                // return getIntentFiles(callbackContext);
            } else if (action.equals("sendBroadcast")) {

                if (args.length() != 1) {
                    //return new PluginResult(PluginResult.Status.INVALID_ACTION);
                    callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.INVALID_ACTION));
                    return false;
                }

                // Parse the arguments
                JSONObject obj = args.getJSONObject(0);

                JSONObject extras = obj.has("extras") ? obj.getJSONObject("extras") : null;
                Map<String, String> extrasMap = new HashMap<String, String>();

                // Populate the extras if any exist
                if (extras != null) {
                    JSONArray extraNames = extras.names();
                    for (int i = 0; i < extraNames.length(); i++) {
                        String key = extraNames.getString(i);
                        String value = extras.getString(key);
                        extrasMap.put(key, value);
                    }
                }

                sendBroadcast(obj.getString("action"), extrasMap);
                //return new PluginResult(PluginResult.Status.OK);
                callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.OK));
                return true;
            }
            //return new PluginResult(PluginResult.Status.INVALID_ACTION);
            callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.INVALID_ACTION));
            return false;
        } catch (JSONException e) {
            e.printStackTrace();
            String errorMessage = e.getMessage();
            //return new PluginResult(PluginResult.Status.JSON_EXCEPTION);
            callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.JSON_EXCEPTION, errorMessage));
            return false;
        }
    }

    private boolean getIntentFiles(CallbackContext callbackContext) {
        CallbackContext callback = (callbackContext == null) ? onNewIntentCallbackContext : callbackContext;

        Intent intent = ((CordovaActivity) this.cordova.getActivity()).getIntent();
        if (callback == null) {
            Log.e(TAG, "getIntentFiles Callback not valid");
            return false;
        }
        if (intent == null) {
            PluginResult mPluginResult = new PluginResult(PluginResult.Status.ERROR, "Intent is null");
            mPluginResult.setKeepCallback(true);
            callback.sendPluginResult(mPluginResult);
            return false;
        }
        final String intentType = intent.getType();
        final String intentAction = intent.getAction();
        final Set<String> intetCategories = intent.getCategories();


        if (intentType == null) {
            Log.e(TAG, "getIntentFiles Intent type not valid");
            PluginResult mPluginResult = new PluginResult(PluginResult.Status.ERROR, "getIntentFiles Intent not for files sharing");
            mPluginResult.setKeepCallback(true);
            callback.sendPluginResult(mPluginResult);
            return false;

        }

        JSONObject data = new JSONObject();
        JSONArray files = new JSONArray();

        if (Intent.ACTION_SEND.equals(intentAction)) {
            Uri imageUri = (Uri) intent.getParcelableExtra(Intent.EXTRA_STREAM);
            String url = intent.getStringExtra(Intent.EXTRA_TEXT);
            if (imageUri != null) {
                Log.i(TAG, "getIntentFiles imageUri:"
                        + "\n  getPath:" + imageUri.getPath()
                        + "\n  getScheme:" + imageUri.getScheme()
                        + "\n  getUserInfo:" + imageUri.getUserInfo()
                        + "\n  getEncodedPath:" + imageUri.getEncodedPath()
                        + "\n  getAuthority:" + imageUri.getAuthority()
                        + "\n  getFragment:" + imageUri.getFragment()
                        + "\n  getSchemeSpecificPart:" + imageUri.getSchemeSpecificPart()
                );
                try {
                    data.put(INTENT_MIME, intentType);
//                    ((CordovaActivity) this.cordova.getActivity()).getContentResolver().
                    files.put(PathUtil.getPath(((CordovaActivity) this.cordova.getActivity()), imageUri)
//                            ((imageUri.getScheme() != null) ? imageUri.getScheme() + "://" : "")
//                                    + ((imageUri.getAuthority() != null) ? imageUri.getAuthority() + "/" : "")
//                                    + imageUri.getPath()
                    );
                    data.put(INTENT_FILE, files);
                } catch (Exception e) {
                    e.printStackTrace();
                }
            } else if (url != null) {
                try {
                    data.put(INTENT_MIME, intentType);
                    if (url.matches("^[http:|https:].*")) {
                        data.put(INTENT_URL, url);
                    }
                } catch (JSONException e) {
                    e.printStackTrace();
                }
            } else {
                PluginResult mPluginResult = new PluginResult(PluginResult.Status.ERROR, "Intent action has no Uri");
                mPluginResult.setKeepCallback(true);
                callback.sendPluginResult(mPluginResult);
                return false;

            }

        } else if (Intent.ACTION_SEND_MULTIPLE.equals(intentAction)) {
            ArrayList<Uri> imageUris = intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM);
            if (imageUris != null && imageUris.size() > 0) {
                try {
                    data.put(INTENT_MIME, intentType);
                    for (Uri uri : imageUris
                            ) {
                        files.put(PathUtil.getPath(((CordovaActivity) this.cordova.getActivity()), uri)
//                                ((uri.getScheme() != null) ? uri.getScheme() + "://" : "")
//                                        + ((uri.getAuthority() != null) ? uri.getAuthority() + "/" : "")
//                                        + uri.getPath()
                        );
                    }
                    data.put(INTENT_FILE, files);
                } catch (Exception e) {
                    e.printStackTrace();
                }
            } else {
                PluginResult mPluginResult = new PluginResult(PluginResult.Status.ERROR, "Intent action has no Uri");
                mPluginResult.setKeepCallback(true);
                callback.sendPluginResult(mPluginResult);
                return false;
            }

        } else {
            PluginResult mPluginResult = new PluginResult(PluginResult.Status.ERROR, "Intent action not for sending files");
            mPluginResult.setKeepCallback(true);
            callback.sendPluginResult(mPluginResult);
            return false;

        }

        Log.i(TAG, "getIntentFiles:"
                + "\n  intent:" + intent
                + "\n  intentType:" + intentType
                + "\n  intentAction:" + intentAction
                + "\n  intetCategories:" + intetCategories
                + "\n  ACTION_SEND:" + Intent.ACTION_SEND
                + "\n  files:" + data
                + "\n  urls:" + files.toString()
        );


        if (!data.isNull(INTENT_FILE) || !data.isNull(INTENT_URL)) {
            //return new PluginResult(PluginResult.Status.OK, i.getStringExtra(extraName));
            PluginResult mPluginResult = new PluginResult(PluginResult.Status.OK, data);
            mPluginResult.setKeepCallback(true);
            callback.sendPluginResult(mPluginResult);
            Log.i(TAG, "getIntentFiles send success callback:" + data);
            return true;
        } else {
            //return new PluginResult(PluginResult.Status.ERROR);
            Log.i(TAG, "getIntentFiles send error callback:" + data);
            PluginResult mPluginResult = new PluginResult(PluginResult.Status.ERROR);
            mPluginResult.setKeepCallback(true);
            callback.sendPluginResult(mPluginResult);
            return false;
        }
    }

    private JSONObject extractIntentData(Intent intent) {
        JSONObject data = new JSONObject();
        String action = intent.getAction();
        Context appContext = cordova.getActivity().getApplicationContext();

        if (Intent.ACTION_SEND.equals(action)) {
            try {
                Uri uri = intent.getParcelableExtra(Intent.EXTRA_STREAM);
                if (uri != null) {
                    JSONArray files = new JSONArray();
                    String url = PathUtil.getPath(appContext, uri);

                    if (url != null) {
                        files.put(url);
                    }
                    data.put(INTENT_FILE, files);
                } else {
                    String url = intent.getStringExtra(Intent.EXTRA_TEXT);
                    if (url != null && url.matches("^[http:|https:].*")) {
                        data.put(INTENT_URL, url);
                    }
                }
                data.put(INTENT_MIME, intent.getType());
            } catch (Exception e) {
                e.printStackTrace();
            }
        } else if (Intent.ACTION_SEND_MULTIPLE.equals(action)) {
            ArrayList<Uri> uris = intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM);
            if (uris != null && uris.size() > 0) {
                try {
                    JSONArray files = new JSONArray();
                    for (Uri uri : uris) {
                        if (uri == null) { continue; }

                        String url = PathUtil.getPath(appContext, uri);
                        if (url != null) {
                            files.put(url);
                        }
                    }
                    data.put(INTENT_FILE, files);
                    data.put(INTENT_MIME, intent.getType());
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
        }else if (Intent.ACTION_VIEW.equals(action)) {
            try {
                Uri uri = intent.getData();
                if (uri != null) {
                    JSONArray files = new JSONArray();
                    String url = PathUtil.getPath(appContext, uri);

                    if (url != null) {
                        files.put(url);
                    }
                    data.put(INTENT_FILE, files);
                } else {
                    String url = intent.getStringExtra(Intent.EXTRA_TEXT);
                    if (url != null && url.matches("^[http:|https:].*")) {
                        data.put(INTENT_URL, url);
                    }
                }
                data.put(INTENT_MIME, intent.getType());
            } catch (Exception e) {
                e.printStackTrace();
            }
        }

        Log.i(TAG, "extractIntentData: "
                + "\n data:" + data
        );
        return data;
    }

    @Override
    public void onNewIntent(Intent intent) {
        super.onNewIntent(intent);

        shareIntent = intent;
        Log.i(TAG, "onNewIntent: "
                + "\n callback:" + onNewIntentCallbackContext
                + "\n intent:" + intent
                + "\n Activity Intent:" + ((CordovaActivity) cordova.getActivity()).getIntent()
                + "\n Parent Activity Intent:" + ((CordovaActivity) cordova.getActivity()).getParentActivityIntent()
                + "\n Categories:" + intent.getCategories()
                + "\n Action:" + intent.getAction()
                + "\n mimeType:" + intent.getType()
        );

        if (onNewIntentCallbackContext != null) {
            //((CordovaActivity) this.cordova.getActivity()).setIntent(intent);
            // putExtra to update current Intent
            // ((CordovaActivity) this.cordova.getActivity()).setIntent(((CordovaActivity) this.cordova.getActivity()).getIntent().putExtras(intent));
            // getIntentFiles(this.onNewIntentCallbackContext);

            JSONObject data = extractIntentData(shareIntent);
            PluginResult mPluginResult = new PluginResult(PluginResult.Status.OK, data);
            mPluginResult.setKeepCallback(true);
            onNewIntentCallbackContext.sendPluginResult(mPluginResult);
        }
    }

    void startActivity(String action, Uri uri, String type, Map<String, String> extras) {
        Log.i(TAG, "startActivity action:" + action + " uri:" + uri + " type:" + type + " extra:" + extras);
        Intent i = (uri != null ? new Intent(action, uri) : new Intent(action));

        if (type != null && uri != null) {
            i.setDataAndType(uri, type); //Fix the crash problem with android 2.3.6
        } else {
            if (type != null) {
                i.setType(type);
            }
        }

        for (String key : extras.keySet()) {
            String value = extras.get(key);
            // If type is text html, the extra text must sent as HTML
            if (key.equals(Intent.EXTRA_TEXT) && type.equals("text/html")) {
                i.putExtra(key, Html.fromHtml(value));
            } else if (key.equals(Intent.EXTRA_STREAM)) {
                // allowes sharing of images as attachments.
                // value in this case should be a URI of a file
                final CordovaResourceApi resourceApi = webView.getResourceApi();
                i.putExtra(key, resourceApi.remapUri(Uri.parse(value)));
            } else if (key.equals(Intent.EXTRA_EMAIL)) {
                // allows to add the email address of the receiver
                i.putExtra(Intent.EXTRA_EMAIL, new String[]{value});
            } else {
                i.putExtra(key, value);
            }
        }
        ((CordovaActivity) this.cordova.getActivity()).startActivity(i);
    }

    void sendBroadcast(String action, Map<String, String> extras) {
        Log.i(TAG, "sendBroadcast action:" + action + " extra:" + extras);
        Intent intent = new Intent();
        intent.setAction(action);
        for (String key : extras.keySet()) {
            String value = extras.get(key);
            intent.putExtra(key, value);
        }

        ((CordovaActivity) this.cordova.getActivity()).sendBroadcast(intent);
    }
}
