package com.izzyan.vehicleservice;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.OpenableColumns;
import java.io.File;
import java.io.FileNotFoundException;

public class ReceiptProvider extends ContentProvider {
  private File getSafeFile(Uri uri) throws FileNotFoundException {
    String filename = uri.getLastPathSegment();
    if (filename == null || !filename.matches("[a-zA-Z0-9_.-]+") || filename.contains("..")) {
      throw new FileNotFoundException("Invalid receipt name");
    }
    File file = new File(getContext().getCacheDir(), filename);
    if (!file.isFile()) throw new FileNotFoundException("Receipt not found");
    return file;
  }
  @Override public boolean onCreate() { return true; }
  @Override public String getType(Uri uri) {
    String path = uri.getLastPathSegment();
    if (path != null && path.endsWith(".pdf")) return "application/pdf";
    if (path != null && path.endsWith(".png")) return "image/png";
    return "image/jpeg";
  }
  @Override public Cursor query(Uri uri, String[] projection, String selection, String[] args, String sortOrder) {
    try {
      File file = getSafeFile(uri);
      MatrixCursor result = new MatrixCursor(new String[]{OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE});
      result.addRow(new Object[]{file.getName(), file.length()});
      return result;
    } catch (FileNotFoundException ignored) { return null; }
  }
  @Override public ParcelFileDescriptor openFile(Uri uri, String mode) throws FileNotFoundException {
    if (!"r".equals(mode)) throw new FileNotFoundException("Read only");
    return ParcelFileDescriptor.open(getSafeFile(uri), ParcelFileDescriptor.MODE_READ_ONLY);
  }
  @Override public Uri insert(Uri uri, ContentValues values) { throw new UnsupportedOperationException(); }
  @Override public int delete(Uri uri, String selection, String[] args) { throw new UnsupportedOperationException(); }
  @Override public int update(Uri uri, ContentValues values, String selection, String[] args) { throw new UnsupportedOperationException(); }
}
