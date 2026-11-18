// Modulo nativo minimo: chiede a macOS come sono impostate le notifiche di questa app
// (UNUserNotificationCenter, l'API ufficiale). Electron non lo espone.
// getSettings() -> Promise<{ authorization, alertStyle } | null>
//   authorization: 'authorized'|'denied'|'provisional'|'notDetermined'; alertStyle: 'alert'|'banner'|'none'
//
// Asincrono apposta: la versione di prima aspettava la risposta bloccando il processo principale (fino a
// 2 secondi a ogni ritorno sulla finestra) e poteva far comparire la rotellina colorata e bloccare i clic.
// Ora la risposta arriva su una coda di sistema e torna a JavaScript con una threadsafe function.
#import <Foundation/Foundation.h>
#import <UserNotifications/UserNotifications.h>
#include <node_api.h>

typedef struct {
  napi_deferred deferred;
  napi_threadsafe_function tsfn;
  const char *authorization;
  const char *style;
  bool ok;
} Request;

// gira sul thread di JavaScript: risolve la Promise e libera tutto
static void Resolve(napi_env env, napi_value js_callback, void *context, void *data) {
  Request *req = (Request *)data;
  if (env != NULL) {
    napi_value result;
    if (req->ok) {
      napi_value a, s;
      napi_create_object(env, &result);
      napi_create_string_utf8(env, req->authorization, NAPI_AUTO_LENGTH, &a);
      napi_create_string_utf8(env, req->style, NAPI_AUTO_LENGTH, &s);
      napi_set_named_property(env, result, "authorization", a);
      napi_set_named_property(env, result, "alertStyle", s);
    } else {
      napi_get_null(env, &result);
    }
    napi_resolve_deferred(env, req->deferred, result);
  }
  napi_release_threadsafe_function(req->tsfn, napi_tsfn_release);
  free(req);
}

static napi_value GetSettings(napi_env env, napi_callback_info info) {
  napi_value promise;
  napi_deferred deferred;
  napi_create_promise(env, &deferred, &promise);

  if (![NSBundle mainBundle].bundleIdentifier) {
    napi_value nothing;
    napi_get_null(env, &nothing);
    napi_resolve_deferred(env, deferred, nothing);
    return promise;
  }

  Request *req = (Request *)calloc(1, sizeof(Request));
  req->deferred = deferred;
  napi_value name;
  napi_create_string_utf8(env, "notification_settings", NAPI_AUTO_LENGTH, &name);
  napi_create_threadsafe_function(env, NULL, NULL, name, 0, 1, NULL, NULL, NULL, Resolve, &req->tsfn);

  [[UNUserNotificationCenter currentNotificationCenter] getNotificationSettingsWithCompletionHandler:^(UNNotificationSettings *settings) {
    req->ok = settings != nil;
    req->authorization = "notDetermined";
    req->style = "none";
    if (settings) {
      switch (settings.authorizationStatus) {
        case UNAuthorizationStatusAuthorized: req->authorization = "authorized"; break;
        case UNAuthorizationStatusDenied: req->authorization = "denied"; break;
        case UNAuthorizationStatusProvisional: req->authorization = "provisional"; break;
        default: break;
      }
      switch (settings.alertStyle) {
        case UNAlertStyleAlert: req->style = "alert"; break;
        case UNAlertStyleBanner: req->style = "banner"; break;
        default: break;
      }
    }
    napi_call_threadsafe_function(req->tsfn, req, napi_tsfn_nonblocking);
  }];
  return promise;
}

NAPI_MODULE_INIT() {
  napi_value fn;
  napi_create_function(env, "getSettings", NAPI_AUTO_LENGTH, GetSettings, NULL, &fn);
  napi_set_named_property(env, exports, "getSettings", fn);
  return exports;
}
