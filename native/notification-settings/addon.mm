// Modulo nativo minimo: chiede a macOS come sono impostate le notifiche di questa app
// (UNUserNotificationCenter, l'API ufficiale). Electron non lo espone.
// getSettings() -> { authorization: 'authorized'|'denied'|'provisional'|'notDetermined', alertStyle: 'alert'|'banner'|'none' } o null
#import <Foundation/Foundation.h>
#import <UserNotifications/UserNotifications.h>
#include <node_api.h>

static napi_value GetSettings(napi_env env, napi_callback_info info) {
  napi_value nothing;
  napi_get_null(env, &nothing);
  if (![NSBundle mainBundle].bundleIdentifier) return nothing;

  __block UNNotificationSettings *settings = nil;
  dispatch_semaphore_t done = dispatch_semaphore_create(0);
  [[UNUserNotificationCenter currentNotificationCenter] getNotificationSettingsWithCompletionHandler:^(UNNotificationSettings *s) {
    settings = s;
    dispatch_semaphore_signal(done);
  }];
  // la risposta arriva su una coda di sistema in pochi millisecondi; al massimo 2 secondi
  if (dispatch_semaphore_wait(done, dispatch_time(DISPATCH_TIME_NOW, 2 * NSEC_PER_SEC)) != 0 || !settings) return nothing;

  const char *authorization = "notDetermined";
  switch (settings.authorizationStatus) {
    case UNAuthorizationStatusAuthorized: authorization = "authorized"; break;
    case UNAuthorizationStatusDenied: authorization = "denied"; break;
    case UNAuthorizationStatusProvisional: authorization = "provisional"; break;
    default: break;
  }
  const char *style = "none";
  switch (settings.alertStyle) {
    case UNAlertStyleAlert: style = "alert"; break;
    case UNAlertStyleBanner: style = "banner"; break;
    default: break;
  }

  napi_value result, a, s;
  napi_create_object(env, &result);
  napi_create_string_utf8(env, authorization, NAPI_AUTO_LENGTH, &a);
  napi_create_string_utf8(env, style, NAPI_AUTO_LENGTH, &s);
  napi_set_named_property(env, result, "authorization", a);
  napi_set_named_property(env, result, "alertStyle", s);
  return result;
}

NAPI_MODULE_INIT() {
  napi_value fn;
  napi_create_function(env, "getSettings", NAPI_AUTO_LENGTH, GetSettings, NULL, &fn);
  napi_set_named_property(env, exports, "getSettings", fn);
  return exports;
}
