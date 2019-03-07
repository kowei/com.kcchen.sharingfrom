// interface Window {
//     SharingFrom: {
//         ACTION_VIEW: any;
//         EXTRA_TEXT: any;
//         startActivity: (params) => Promise<any>;
//         hasExtra: (params) => Promise<any>;
//         getExtra: (params) => Promise<any>;
//         getUri: () => Promise<string>;
//         onNewIntent: () => Promise<IntentData>;
//         clearIntent: () => Promise<any>;
//         sendBroadcast: (params) => Promise<any>;
//         close: () => void;
//     }
// }

interface Window {
    SharingFrom: {
        ACTION_VIEW: string;
        EXTRA_TEXT: string;
        ACTION_SEND: string;
        EXTRA_SUBJECT: string;
        EXTRA_STREAM: string;
        EXTRA_EMAIL: string;
        ACTION_CALL: string;
        ACTION_SENDTO: string;

        startActivity: (params, success: () => any, failure: () => any) => void;
        hasExtra: (params, success: () => any, failure: () => any) => void;
        getExtra: (params, success: () => any, failure: () => any) => void;
        getUri: (success: (uri: string) => any, failure: () => any) => void;
        onNewIntent: (success: (data: IntentData) => any, failure: () => any) => void;
        clearIntent: (success: () => any, failure: () => any) => void;
        sendBroadcast: (params, success: () => any, failure: () => any) => void;
        close: (success: () => any, failure: () => any) => void;
    }
}

declare interface IntentData {
    MIME: string;
    FILE?: string[];
    URL?: string;
    TEXT?: string;
}
