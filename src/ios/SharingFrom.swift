import Foundation
import UIKit
import Social
import MobileCoreServices

@objc(SharingFrom) class SharingFrom : CDVPlugin {
    
    let suiteName = "group.com.kcchen.SharingFrom"
    
    private var intentData: [String: AnyObject]?;
    private var onNewIntentCallbackId: String?;
    
    override func pluginInitialize() {
        print("> SFN pluginInitialize");
        intentData = nil;
        onNewIntentCallbackId = nil;
        
        NotificationCenter.default.addObserver(self, selector: #selector(didFinishLaunching), name: NSNotification.Name.UIApplicationDidFinishLaunching, object: nil);
        
    }
    
    func didFinishLaunching(_ notification: Notification) {
         print("> SFN didFinishLaunching");
        if notification.userInfo != nil {
            // lanuched by url
            let info = notification.userInfo?.first;
            if let lanuhedUrl = info?.value as? URL {
                NSLog("> SFN lanuhedUrl: %@", lanuhedUrl.description);
                intentData = extractData(url: lanuhedUrl);
            }
        }
    }
    
    override func onAppTerminate() {
        print("> SFN onAppTerminate");
        NotificationCenter.default.removeObserver(self)
    }
    
    func onNewIntent(_ command: CDVInvokedUrlCommand) {
        print("> SFN onNewIntent: \(String(describing: intentData))");
        //        if onNewIntentCallbackId != nil {
        //            // release prev callback
        //            let pluginResult = CDVPluginResult(status: CDVCommandStatus_OK);
        //            self.commandDelegate!.send(pluginResult, callbackId: onNewIntentCallbackId);
        //        }
        onNewIntentCallbackId = command.callbackId;
        
        if intentData != nil {
            let pluginResult = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: intentData);
            pluginResult?.setKeepCallbackAs(true);
            self.commandDelegate!.send(pluginResult, callbackId: onNewIntentCallbackId);
        }
    }

    override func handleOpenURL(_ notification: Notification!) {
        super.handleOpenURL(notification);
        print("> SFN handleOpenURL");

        if onNewIntentCallbackId != nil {
            if let sharedUrl = notification.object as? URL {
                var pluginResult: CDVPluginResult?;
                NSLog("> SFN sharedUrl: %@", sharedUrl.absoluteString);
                
                if sharedUrl.absoluteString.hasPrefix("file://") {
                    let result: NSMutableDictionary = NSMutableDictionary();
                    var files: [String] = [];
                    files.append(sharedUrl.absoluteString);
                    result["FILE"] = files;
                    result["MIME"] = extTomimeType(ext: sharedUrl.pathExtension.lowercased());

                    intentData = result as? [String: AnyObject];
                    pluginResult = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: intentData);
                } else if sharedUrl.absoluteString.hasPrefix("penpal://") {
                    intentData = extractData(url: sharedUrl);
                    pluginResult = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: intentData);
                }
                
                if pluginResult != nil {
                    pluginResult?.setKeepCallbackAs(true);
                    self.commandDelegate!.send(pluginResult, callbackId: onNewIntentCallbackId);
                }
            }
        }
    }
    
    func extractData(url: URL) -> [String: AnyObject] {
        print("> SFN extractData");
        let decodeStr = url.description.removingPercentEncoding?.replacingOccurrences(of: "penpal://", with: "");
        let params = decodeStr?.components(separatedBy: "&");
        
        let result: NSMutableDictionary = NSMutableDictionary();
        var files: [String] = [];
        
        for param in params! {
            var dataSplits = param.components(separatedBy: "=");
            let data = dataSplits.popLast();
            let name = dataSplits.popLast();
            
            switch name! {
            case "url":
                result["URL"] = data;
                break;
            case "file":
                files.append(data!);
                break;
            case "type":
                result["MIME"] = data;
                break;
            case "text":
                result["TEXT"] = data;
                break;
            default:
                break
            }
        }
        
        if files.capacity > 0 {
            result["FILE"] = files;
        }
        
        return result as! [String: AnyObject];
    }
    
    func extTomimeType(ext: String) -> String {
        print("> SFN extTomimeType");
        switch (ext) {
        case "jpg":
            return "image/jpeg";
        case "png":
            return "image/png";
        case "gif":
            return "image/gif";
        case "tiff":
            return "image/tiff";
        case "pdf":
            return "application/pdf";
        default:
            return "image/jpeg";
        }
    }
    
    func startActivity(_ command: CDVInvokedUrlCommand) {
        let pluginResult:CDVPluginResult = CDVPluginResult(status: CDVCommandStatus_OK);
        self.commandDelegate!.send(pluginResult, callbackId: command.callbackId);
        print("> SFN startActivity");
    }

    func hasExtra(_ command: CDVInvokedUrlCommand) {
        let pluginResult:CDVPluginResult = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: false);
        self.commandDelegate!.send(pluginResult, callbackId: command.callbackId);
        print("> SFN hasExtra");
    }

    func getExtra(_ command: CDVInvokedUrlCommand) {
        let pluginResult:CDVPluginResult = CDVPluginResult(status: CDVCommandStatus_OK);
        self.commandDelegate!.send(pluginResult, callbackId: command.callbackId);
        print("> SFN getExtra");
    }

    func getUri(_ command: CDVInvokedUrlCommand) {
        let pluginResult:CDVPluginResult = CDVPluginResult(status: CDVCommandStatus_OK);
        self.commandDelegate!.send(pluginResult, callbackId: command.callbackId);
        print("> SFN getUri");
    }

    func clearIntent(_ command: CDVInvokedUrlCommand) {
        intentData = nil;
        
        let pluginResult = CDVPluginResult(status: CDVCommandStatus_OK);
        self.commandDelegate!.send(pluginResult, callbackId: command.callbackId);
        print("> SFN clearIntent");
    }

    func sendBroadcast(_ command: CDVInvokedUrlCommand) {
        let pluginResult = CDVPluginResult(status: CDVCommandStatus_OK);
        self.commandDelegate!.send(pluginResult, callbackId: command.callbackId);
        print("> SFN sendBroadcast");
    }

    func close(_ command: CDVInvokedUrlCommand) {
        let pluginResult = CDVPluginResult(status: CDVCommandStatus_OK);
        self.commandDelegate!.send(pluginResult, callbackId: command.callbackId);
        print("> SFN close");
    }
}
