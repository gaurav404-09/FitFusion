import { Platform } from 'react-native';
import Constants from 'expo-constants';

// For physical device testing, use your laptop's local IP address
// You can find this by running 'ipconfig getifaddr en0' on Mac
const LOCAL_IP = '10.67.66.163';

function getLanHost() {
    const hostUri = Constants?.expoConfig?.hostUri || Constants?.manifest2?.extra?.expoGo?.hostUri;
    if (typeof hostUri === 'string' && hostUri.length > 0) {
        const host = hostUri.split(':')[0];
        if (host) return host;
    }
    return LOCAL_IP;
}

const BASE_URL = Platform.OS === 'web'
    ? 'http://localhost:5001/api'
    : `http://${getLanHost()}:5001/api`;

export default {
    BASE_URL,
    AUTH_URL: `${BASE_URL}/auth`,
};
