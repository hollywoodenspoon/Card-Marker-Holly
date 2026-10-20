package io.github.hollywoodenspoon.cardmaker;

import android.app.Activity;
import android.content.ContentResolver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.UriPermission;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.provider.DocumentsContract;
import android.util.Base64;
import android.webkit.MimeTypeMap;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.json.JSONArray;
import org.json.JSONException;

/**
 * Real folders for the Android app (src/platform/android.ts is the other half).
 *
 * Paths are virtual:
 *   /app/...        the app's private files (settings.json)
 *   /tree/N/...     inside folder N that the user picked with Android's folder picker
 *                   (Storage Access Framework; the permission is kept across restarts)
 */
@CapacitorPlugin(name = "CardMakerFolders")
public class FoldersPlugin extends Plugin {

    private static final String PREFS = "card-maker-folders";
    private static final String TREES = "trees";
    private static final String DIR = DocumentsContract.Document.MIME_TYPE_DIR;

    /** Picked folders, by index (the N in /tree/N). */
    private final List<Uri> trees = new ArrayList<>();
    /** Document id per virtual path, so lookups don't walk the folders every time. */
    private final Map<String, String> ids = new HashMap<>();

    @Override
    public void load() {
        try {
            JSONArray a = new JSONArray(prefs().getString(TREES, "[]"));
            for (int i = 0; i < a.length(); i++) trees.add(Uri.parse(a.getString(i)));
        } catch (JSONException e) {
            // Start with no folders.
        }
    }

    private SharedPreferences prefs() {
        return getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private void saveTrees() {
        JSONArray a = new JSONArray();
        for (Uri u : trees) a.put(u.toString());
        prefs().edit().putString(TREES, a.toString()).apply();
    }

    private ContentResolver resolver() {
        return getContext().getContentResolver();
    }

    // ---------- picking folders ----------

    @PluginMethod
    public void pickFolder(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        intent.addFlags(
            Intent.FLAG_GRANT_READ_URI_PERMISSION |
            Intent.FLAG_GRANT_WRITE_URI_PERMISSION |
            Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION
        );
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            // Start in Documents, where "Card Maker" usually goes.
            intent.putExtra(
                DocumentsContract.EXTRA_INITIAL_URI,
                DocumentsContract.buildDocumentUri("com.android.externalstorage.documents", "primary:Documents")
            );
        }
        startActivityForResult(call, intent, "folderPicked");
    }

    @ActivityCallback
    private void folderPicked(PluginCall call, ActivityResult result) {
        JSObject ret = new JSObject();
        Intent data = result.getData();
        if (result.getResultCode() != Activity.RESULT_OK || data == null || data.getData() == null) {
            ret.put("path", null);
            call.resolve(ret);
            return;
        }
        Uri uri = data.getData();
        try {
            resolver().takePersistableUriPermission(
                uri,
                Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION
            );
        } catch (SecurityException e) {
            call.reject("Android did not allow keeping access to this folder.");
            return;
        }
        int n = trees.indexOf(uri);
        if (n < 0) {
            trees.add(uri);
            n = trees.size() - 1;
            saveTrees();
        }
        ret.put("path", "/tree/" + n);
        ret.put("label", label(uri));
        call.resolve(ret);
    }

    /** The picked folders that are still accessible, with readable names. */
    @PluginMethod
    public void roots(PluginCall call) {
        List<Uri> granted = new ArrayList<>();
        for (UriPermission p : resolver().getPersistedUriPermissions())
            if (p.isReadPermission() && p.isWritePermission()) granted.add(p.getUri());
        JSArray list = new JSArray();
        for (int i = 0; i < trees.size(); i++) {
            JSObject o = new JSObject();
            o.put("path", "/tree/" + i);
            o.put("label", label(trees.get(i)));
            o.put("granted", granted.contains(trees.get(i)));
            list.put(o);
        }
        JSObject ret = new JSObject();
        ret.put("roots", list);
        call.resolve(ret);
    }

    /** "primary:Documents/Card Maker" → "Documents/Card Maker" (SD cards keep their id). */
    private static String label(Uri tree) {
        String id = DocumentsContract.getTreeDocumentId(tree);
        int colon = id.indexOf(':');
        if (colon < 0) return id;
        String vol = id.substring(0, colon);
        String rest = id.substring(colon + 1);
        return vol.equals("primary") ? rest : vol + "/" + rest;
    }

    // ---------- path resolution ----------

    private static class Target {

        File file; // /app paths
        Uri tree; // /tree paths
        String treeKey; // "/tree/N"
        String[] parts; // path inside the tree
    }

    private Target target(String path) throws IOException {
        if (path == null || path.contains("/../") || path.endsWith("/..")) throw new IOException("Bad path");
        Target t = new Target();
        if (path.equals("/app") || path.startsWith("/app/")) {
            t.file = new File(getContext().getFilesDir(), path.substring(4));
            return t;
        }
        if (!path.startsWith("/tree/")) throw new IOException("Not an app folder: " + path);
        String[] all = path.substring(6).split("/");
        int n;
        try {
            n = Integer.parseInt(all[0]);
        } catch (NumberFormatException e) {
            throw new IOException("Bad path: " + path);
        }
        if (n < 0 || n >= trees.size()) throw new IOException("Unknown folder: " + path);
        t.tree = trees.get(n);
        t.treeKey = "/tree/" + n;
        List<String> parts = new ArrayList<>();
        for (int i = 1; i < all.length; i++) if (!all[i].isEmpty() && !all[i].equals(".")) parts.add(all[i]);
        t.parts = parts.toArray(new String[0]);
        return t;
    }

    private String key(Target t, int depth) {
        StringBuilder b = new StringBuilder(t.treeKey);
        for (int i = 0; i < depth; i++) b.append('/').append(t.parts[i]);
        return b.toString();
    }

    /** Document id of the path's first `depth` parts, or null when missing (optionally creating folders). */
    private synchronized String docId(Target t, int depth, boolean createDirs) throws IOException {
        String id = DocumentsContract.getTreeDocumentId(t.tree);
        for (int i = 0; i < depth; i++) {
            String k = key(t, i + 1);
            String cached = ids.get(k);
            if (cached != null) {
                id = cached;
                continue;
            }
            String child = findChild(t.tree, id, t.parts[i]);
            if (child == null) {
                if (!createDirs) return null;
                Uri made = DocumentsContract.createDocument(resolver(), docUri(t.tree, id), DIR, t.parts[i]);
                if (made == null) throw new IOException("Could not create folder " + t.parts[i]);
                child = DocumentsContract.getDocumentId(made);
            }
            ids.put(k, child);
            id = child;
        }
        return id;
    }

    private String findChild(Uri tree, String parentId, String name) {
        Uri children = DocumentsContract.buildChildDocumentsUriUsingTree(tree, parentId);
        String[] cols = { DocumentsContract.Document.COLUMN_DOCUMENT_ID, DocumentsContract.Document.COLUMN_DISPLAY_NAME };
        try (Cursor c = resolver().query(children, cols, null, null, null)) {
            if (c == null) return null;
            while (c.moveToNext()) if (name.equals(c.getString(1))) return c.getString(0);
        }
        return null;
    }

    private static Uri docUri(Uri tree, String id) {
        return DocumentsContract.buildDocumentUriUsingTree(tree, id);
    }

    private synchronized void forget(Target t) {
        String k = key(t, t.parts.length);
        ids.keySet().removeIf((p) -> p.equals(k) || p.startsWith(k + "/"));
    }

    // ---------- files ----------

    @PluginMethod
    public void read(PluginCall call) {
        try {
            Target t = target(call.getString("path"));
            byte[] bytes = null;
            if (t.file != null) {
                if (t.file.isFile()) try (InputStream in = new FileInputStream(t.file)) {
                    bytes = readAll(in);
                }
            } else {
                String id = docId(t, t.parts.length, false);
                if (id != null) try (InputStream in = resolver().openInputStream(docUri(t.tree, id))) {
                    if (in != null) bytes = readAll(in);
                } catch (FileNotFoundException e) {
                    forget(t);
                }
            }
            JSObject ret = new JSObject();
            ret.put("data", bytes == null ? null : Base64.encodeToString(bytes, Base64.NO_WRAP));
            call.resolve(ret);
        } catch (Exception e) {
            call.reject(e.getMessage(), e);
        }
    }

    /**
     * Write a file, creating folders. `atomic` writes NAME.tmp first and swaps it in;
     * `backup` keeps the previous file as NAME.bak.
     */
    @PluginMethod
    public void write(PluginCall call) {
        try {
            Target t = target(call.getString("path"));
            byte[] bytes = payload(call);
            boolean atomic = Boolean.TRUE.equals(call.getBoolean("atomic", false));
            boolean backup = Boolean.TRUE.equals(call.getBoolean("backup", false));
            if (t.file != null) writeAppFile(t.file, bytes, atomic, backup);
            else writeTreeFile(t, bytes, atomic, backup);
            call.resolve();
        } catch (Exception e) {
            call.reject(e.getMessage(), e);
        }
    }

    private static byte[] payload(PluginCall call) {
        String text = call.getString("text");
        if (text != null) return text.getBytes(StandardCharsets.UTF_8);
        String b64 = call.getString("data", "");
        return Base64.decode(b64, Base64.DEFAULT);
    }

    private static void writeAppFile(File f, byte[] bytes, boolean atomic, boolean backup) throws IOException {
        File dir = f.getParentFile();
        if (dir != null && !dir.isDirectory() && !dir.mkdirs()) throw new IOException("Could not create " + dir);
        File tmp = atomic ? new File(f.getPath() + ".tmp") : f;
        try (FileOutputStream out = new FileOutputStream(tmp)) {
            out.write(bytes);
            out.getFD().sync();
        }
        if (!atomic) return;
        if (backup && f.isFile()) copy(f, new File(f.getPath() + ".bak"));
        if (!tmp.renameTo(f)) throw new IOException("Could not save " + f.getName());
    }

    private void writeTreeFile(Target t, byte[] bytes, boolean atomic, boolean backup) throws IOException {
        if (t.parts.length == 0) throw new IOException("A file name is needed.");
        String name = t.parts[t.parts.length - 1];
        String parent = docId(t, t.parts.length - 1, true);
        Uri parentUri = docUri(t.tree, parent);
        if (!atomic) {
            writeDoc(createOrGet(t, parentUri, parent, name), bytes);
            return;
        }
        // Android folders can't replace a file in one step: write NAME.tmp, move the old
        // file to NAME.bak (or delete it), then rename NAME.tmp. Opening a project
        // recovers from NAME.tmp / NAME.bak if the app stopped in between.
        String tmpName = name + ".tmp";
        Uri tmp = createOrGet(t, parentUri, parent, tmpName);
        writeDoc(tmp, bytes);
        String old = findChild(t.tree, parent, name);
        try {
            if (old != null) {
                if (backup) {
                    String bak = findChild(t.tree, parent, name + ".bak");
                    if (bak != null) DocumentsContract.deleteDocument(resolver(), docUri(t.tree, bak));
                    DocumentsContract.renameDocument(resolver(), docUri(t.tree, old), name + ".bak");
                } else DocumentsContract.deleteDocument(resolver(), docUri(t.tree, old));
            }
            DocumentsContract.renameDocument(resolver(), tmp, name);
        } catch (UnsupportedOperationException | IllegalArgumentException e) {
            // Some providers (cloud folders) can't rename: write the file in place instead.
            writeDoc(createOrGet(t, parentUri, parent, name), bytes);
            DocumentsContract.deleteDocument(resolver(), tmp);
        } finally {
            synchronized (this) {
                String base = key(t, t.parts.length - 1);
                ids.remove(base + "/" + name);
                ids.remove(base + "/" + tmpName);
                ids.remove(base + "/" + name + ".bak");
            }
        }
    }

    private Uri createOrGet(Target t, Uri parentUri, String parentId, String name) throws IOException {
        String id = findChild(t.tree, parentId, name);
        if (id != null) return docUri(t.tree, id);
        Uri made = DocumentsContract.createDocument(resolver(), parentUri, mimeOf(name), name);
        if (made == null) throw new IOException("Could not create " + name);
        return made;
    }

    private void writeDoc(Uri uri, byte[] bytes) throws IOException {
        // "wt" truncates, so a shorter file never keeps old bytes at the end.
        try (OutputStream out = resolver().openOutputStream(uri, "wt")) {
            if (out == null) throw new IOException("Could not write the file.");
            out.write(bytes);
        }
    }

    @PluginMethod
    public void exists(PluginCall call) {
        try {
            Target t = target(call.getString("path"));
            boolean found = t.file != null ? t.file.exists() : docId(t, t.parts.length, false) != null;
            JSObject ret = new JSObject();
            ret.put("exists", found);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject(e.getMessage(), e);
        }
    }

    @PluginMethod
    public void list(PluginCall call) {
        try {
            Target t = target(call.getString("path"));
            JSArray names = new JSArray();
            boolean found = false;
            if (t.file != null) {
                String[] files = t.file.list();
                if (files != null) {
                    found = true;
                    for (String f : files) names.put(f);
                }
            } else {
                String id = docId(t, t.parts.length, false);
                if (id != null) {
                    found = true;
                    Uri children = DocumentsContract.buildChildDocumentsUriUsingTree(t.tree, id);
                    String[] cols = { DocumentsContract.Document.COLUMN_DISPLAY_NAME };
                    try (Cursor c = resolver().query(children, cols, null, null, null)) {
                        while (c != null && c.moveToNext()) names.put(c.getString(0));
                    }
                }
            }
            JSObject ret = new JSObject();
            ret.put("names", found ? names : null);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject(e.getMessage(), e);
        }
    }

    @PluginMethod
    public void remove(PluginCall call) {
        try {
            Target t = target(call.getString("path"));
            if (t.file != null) {
                if (t.file.isFile() && !t.file.delete()) throw new IOException("Could not delete the file.");
            } else {
                String id = docId(t, t.parts.length, false);
                if (id != null) DocumentsContract.deleteDocument(resolver(), docUri(t.tree, id));
                forget(t);
            }
            call.resolve();
        } catch (Exception e) {
            call.reject(e.getMessage(), e);
        }
    }

    /** Delete a project folder (refused unless it holds a project.json). */
    @PluginMethod
    public void removeProject(PluginCall call) {
        try {
            Target t = target(call.getString("path"));
            if (t.tree == null || t.parts.length == 0) throw new IOException("Only project folders can be deleted.");
            String id = docId(t, t.parts.length, false);
            if (id == null) {
                call.resolve();
                return;
            }
            if (findChild(t.tree, id, "project.json") == null)
                throw new IOException("This folder does not look like a project, so it was not deleted.");
            DocumentsContract.deleteDocument(resolver(), docUri(t.tree, id));
            forget(t);
            call.resolve();
        } catch (Exception e) {
            call.reject(e.getMessage(), e);
        }
    }

    // ---------- "Save as" for exports ----------

    private byte[] pendingSave;

    @PluginMethod
    public void saveAs(PluginCall call) {
        String name = call.getString("name", "file");
        pendingSave = payload(call);
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(mimeOf(name));
        intent.putExtra(Intent.EXTRA_TITLE, name);
        startActivityForResult(call, intent, "savePicked");
    }

    @ActivityCallback
    private void savePicked(PluginCall call, ActivityResult result) {
        byte[] bytes = pendingSave;
        pendingSave = null;
        JSObject ret = new JSObject();
        Intent data = result.getData();
        if (result.getResultCode() != Activity.RESULT_OK || data == null || data.getData() == null || bytes == null) {
            ret.put("name", null);
            call.resolve(ret);
            return;
        }
        try {
            writeDoc(data.getData(), bytes);
            ret.put("name", displayName(data.getData()));
            call.resolve(ret);
        } catch (IOException e) {
            call.reject(e.getMessage(), e);
        }
    }

    private String displayName(Uri uri) {
        try (Cursor c = resolver().query(uri, new String[] { DocumentsContract.Document.COLUMN_DISPLAY_NAME }, null, null, null)) {
            if (c != null && c.moveToFirst()) return c.getString(0);
        } catch (Exception e) {
            // Fall through.
        }
        return uri.getLastPathSegment();
    }

    // ---------- helpers ----------

    private static String mimeOf(String name) {
        int dot = name.lastIndexOf('.');
        String ext = dot < 0 ? "" : name.substring(dot + 1).toLowerCase();
        if (ext.equals("json") || ext.equals("bak") || ext.equals("tmp")) return "application/octet-stream";
        String mime = MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext);
        return mime != null ? mime : "application/octet-stream";
    }

    private static byte[] readAll(InputStream in) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buf = new byte[64 * 1024];
        int n;
        while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
        return out.toByteArray();
    }

    private static void copy(File from, File to) throws IOException {
        try (InputStream in = new FileInputStream(from); OutputStream out = new FileOutputStream(to)) {
            byte[] buf = new byte[64 * 1024];
            int n;
            while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
        }
    }
}
