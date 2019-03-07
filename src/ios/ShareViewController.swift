//
//  ShareViewController.swift
//  SharingFrom
//
//  Created by KC Chen on 2017/4/11.
//
//

import UIKit
import Social
import MobileCoreServices

class ShareViewController: SLComposeServiceViewController {
    let suiteName = "group.com.kcchen.penpal.SharingFrom"
    
    override func viewDidLoad() {
        super.viewDidLoad();
        print("> SFNVC viewDidLoad");
    }
    
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated);
        print("> SFNVC viewWillAppear");
    }
    
    override func isContentValid() -> Bool {
        print("> SFNVC isContentValid")
        // Do validation of contentText and/or NSExtensionContext attachments here
        return true
    }
    
    override func didSelectPost() {
        print("> SFNVC didSelectPost")
        // This is called after the user selects Post. Do the upload of contentText and/or NSExtensionContext attachments.
        
        // Inform the host that we're done, so it un-blocks its UI. Note: Alternatively you could call super's -didSelectPost, which will similarly complete the extension context.
        // This is called after the user selects Post.
        // Make sure we have a valid extension item
        if let item = extensionContext!.inputItems.first as? NSExtensionItem {
            // let contentType = kUTTypeImage as String
            
            // Verify the provider is valid
            if let itemProviders = item.attachments as? [NSItemProvider] {
                
                let asyncLoadGroup = DispatchGroup();
                let sharedFilePath = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: suiteName);
                var urlQuery: String = "";
                
                for attachment in itemProviders {
                    print("> SFNVC attachment: " + attachment.description);

                    
                    if (attachment.hasItemConformingToTypeIdentifier(kUTTypeImage as String) || attachment.hasItemConformingToTypeIdentifier(kUTTypePDF as String)){
                        asyncLoadGroup.enter();
                        var type:String = "";
                        var prefix:String = "";
                        if attachment.hasItemConformingToTypeIdentifier(kUTTypeImage as String){
                            type = kUTTypeImage as String
                            prefix = "image_";
                        }else if attachment.hasItemConformingToTypeIdentifier(kUTTypePDF as String){
                            type = kUTTypePDF as String
                            prefix = "pdf_";
                        }
                        if(!type.isEmpty){
                            attachment.loadItem(forTypeIdentifier: type, options: nil, completionHandler: { data, error in
                                // look for images
                                print("> SFNVC data: " + data.debugDescription);
                                do {
                                    let imageData: Data?;
                                    var imageUrl: URL?;
                                    var mimeType: String?;
                                    
                                    switch data {
                                    case let image as UIImage:
                                        print("> SFNVC data is UIImage");
                                        imageData = UIImagePNGRepresentation(image)!;
                                        break;
                                    case let imgData as Data:
                                        print("> SFNVC data is NSData");
                                        imageData = imgData;
                                        mimeType = self.getMimeType(data: imageData!);
                                        break;
                                    case let url as URL:
                                        print("> SFNVC data is URL: " + url.description);
                                        if (url.isFileURL) {
                                            imageData = try Data(contentsOf: url);
                                            mimeType = self.getMimeType(data: imageData!);
                                        } else {
                                            imageData = nil;
                                            imageUrl = url;
                                            mimeType = "text/plain";
                                        }
                                        print("> SFNVC mimeType: " + mimeType!);
                                        break;
                                    default:
                                        // There may be other cases...
                                        print("> SFNVC Unexpected data:", type(of: data));
                                        imageData = nil;
                                    }
                                    
                                    if (imageData != nil) {
                                        if (mimeType == nil) {
                                            mimeType = self.getMimeType(data: imageData!);
                                        }
                                        
                                        let fileName = prefix + (imageData?.count.description)! + self.mimeTypeToExt(type: mimeType!);
                                        let sharedImageUrl = sharedFilePath?.appendingPathComponent(fileName);
                                        try imageData?.write(to: sharedImageUrl!, options: Data.WritingOptions.atomic);
                                        
                                        let sharedPath = sharedImageUrl?.absoluteString;
                                        urlQuery += ("file=" + sharedPath! + "&type=" + mimeType! + ";");
                                        print("> SFNVC sharedImageUrl: " + sharedPath!);
                                    } else if (imageUrl != nil) {
                                        urlQuery += "url=" + (imageUrl?.description)! + "&type=" + mimeType! + ";";
                                        print("> SFNVC webUrl: " + (imageUrl?.description)!);
                                    }
                                    asyncLoadGroup.leave();
                                } catch {
                                    print("> SFNVC error:\(error)");
                                }
                            })
                        }
                    } else if attachment.hasItemConformingToTypeIdentifier(kUTTypeURL as String) {
                        asyncLoadGroup.enter();
                        
                        attachment.loadItem(forTypeIdentifier: kUTTypeURL as String, options: nil, completionHandler: { url, error in
                            if let webUrl = url as? URL {
                                urlQuery += "url=" + webUrl.description + "&type=text/plain;";
                                print("> SFNVC webUrl: " + webUrl.description);
                            }
                            asyncLoadGroup.leave();
                        });
                    }
                }
                
                asyncLoadGroup.notify(queue: DispatchQueue.main, execute: {
                    urlQuery += "title=" + self.contentText;
                    self.sendSharingData(query: urlQuery);
                    self.extensionContext!.completeRequest(returningItems: nil, completionHandler: nil);
                    print("> SFNVC  finish sharing");
                });
            }
        }
    }
    

    func mimeTypeToExt(type: String) -> String {
        switch (type) {
        case "image/jpeg":
            return ".jpg";
        case "image/png":
            return ".png";
        case "image/gif":
            return ".gif";
        case "image/tiff":
            return ".tiff";
        case "application/pdf":
            return ".pdf";
        default:
            return ".jpg";
        }
    }

    func getMimeType(data: Data) -> String {
        var values = [UInt8](repeating:0, count:1)
        data.copyBytes(to: &values, count: 1)
        
        switch (values[0]) {
        case 0xFF:
            return "image/jpeg";
        case 0x89:
            return "image/png";
        case 0x47:
            return "image/gif";
        case 0x49, 0x4D:
            return "image/tiff";
        case 0x25:
            return "application/pdf";
        case 0x46:
            return "text/plain";
        default:
            return "application/octet-stream";
        }
    }
    
    override func didSelectCancel() {
        print("> SFNVC didSelectCancel")
    }
    
    
    // Saves an image to user defaults.
    func saveImage(_ color: String, imageData: Data) {
        if let prefs = UserDefaults(suiteName: suiteName) {
            prefs.removeObject(forKey: color)
            prefs.set(imageData, forKey: color)
            prefs.synchronize()
        }
    }

    // // https://stackoverflow.com/questions/24297273/openurl-not-work-in-action-extension/40675306#40675306
    // // for skip compile error. (but can't open host app)
    // func openURL(_ url: URL) {
    //    self.extensionContext?.open(url, completionHandler: nil);
    // }
    
    func sendSharingData(query: String) {
        let queryStr = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed)!;
        let allowedCharacterSet = (CharacterSet(charactersIn: "!*'();:@&=+$,/?%#[] ").inverted); // encoding url
        let encodeQuery = queryStr.addingPercentEncoding(withAllowedCharacters: allowedCharacterSet);
        let url = NSURL(string: "penpal://" + (encodeQuery?.description)!);
        let selectorOpenURL = sel_registerName("openURL:")
        let context = NSExtensionContext()

        // let selector = #selector(openURL(_:));
//        var r: UIResponder? = self as UIResponder;
//        while r != nil {
//            if r!.responds(to: "openURL:") {
//                print("> sendSharingData openURL: " + (url?.description)!);
//                r!.perform("openURL:", with: url);
//                return;
//            }else{
//                print("> sendSharingData UIResponder: " + r.debugDescription);
//            }
//            r = r?.next;
//        }
        
//        let url = NSURL(string: urlString)
        context.open(url! as URL, completionHandler: nil)
        
        var responder = self as UIResponder?
        
        while (responder != nil){
            if responder?.responds(to: selectorOpenURL) == true{
                print("> SFNVC sendSharingData - " + (url?.absoluteString)!);
                responder?.perform(selectorOpenURL, with: url)
            }
            print("> SFNVC sendSharingData responder - " + responder.debugDescription);
            responder = responder!.next
        }
    }

    override func provideImageData(_ data: UnsafeMutableRawPointer, bytesPerRow rowbytes: Int, origin x: Int, _ y: Int, size width: Int, _ height: Int, userInfo info: Any?) {
        super.provideImageData(data, bytesPerRow: rowbytes, origin: x, y, size: width, height, userInfo: info)
        print("> SFNVC provideImageData")
    }
}
