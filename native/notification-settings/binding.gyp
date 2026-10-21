{
  "targets": [
    {
      "target_name": "notification_settings",
      "sources": ["addon.mm"],
      "xcode_settings": {
        "CLANG_ENABLE_OBJC_ARC": "YES",
        "MACOSX_DEPLOYMENT_TARGET": "12.0",
        "OTHER_CFLAGS": ["-fobjc-arc"]
      },
      "link_settings": {
        "libraries": ["-framework Foundation", "-framework UserNotifications"]
      }
    }
  ]
}
