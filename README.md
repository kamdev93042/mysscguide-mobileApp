# MySSCGuide – Expo React Native

Front-end only: pages for your platform. Backend is already deployed; this app only consumes the API.

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set your API base URL**  
   Edit `config/api.js` and replace `https://your-api.com` with your deployed backend base URL.

3. **Run the app**
   ```bash
   npm start
   ```
   Then press `a` for Android, `i` for iOS, or `w` for web.

## Project structure

- **`config/api.js`** – API base URL (no backend code here).
- **`screens/`** – One file per screen (e.g. `HomeScreen.js`). Add new screens here.
- **`App.js`** – Registers the stack navigator. Add new screens to the `<Stack.Navigator>` when you create them.

## Adding a new page

1. Create `screens/YourScreen.js` (e.g. copy `HomeScreen.js` and rename).
2. In `App.js`:  
   - `import YourScreen from './screens/YourScreen';`  
   - Add `<Stack.Screen name="YourScreen" component={YourScreen} />` inside the navigator.

You can then navigate to it with `navigation.navigate('YourScreen')` from any screen.

## API calls

Use `API_BASE_URL` from `config/api.js` for all requests, e.g.:

```js
import { API_BASE_URL } from '../config/api';

fetch(`${API_BASE_URL}/your-endpoint`)
  .then(res => res.json())
  .then(data => { ... });
```

No backend or server code lives in this repo—only UI and API consumption.
