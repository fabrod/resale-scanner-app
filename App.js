import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TouchableOpacity, Text } from 'react-native';
import ScannerScreen from './src/screens/ScannerScreen';
import ManualEntryScreen from './src/screens/ManualEntryScreen';
import VerdictScreen from './src/screens/VerdictScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ListItScreen from './src/screens/ListItScreen';

const Stack = createNativeStackNavigator();

function headerButtons(navigation) {
  return {
    headerRight: () => (
      <>
        <TouchableOpacity onPress={() => navigation.navigate('History')} style={{ marginRight: 16 }}>
          <Text style={{ color: '#2563eb', fontSize: 16 }}>History</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
          <Text style={{ color: '#2563eb', fontSize: 16 }}>Settings</Text>
        </TouchableOpacity>
      </>
    ),
  };
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Scanner">
        <Stack.Screen
          name="Scanner"
          component={ScannerScreen}
          options={({ navigation }) => ({ title: 'Scan a product', ...headerButtons(navigation) })}
        />
        <Stack.Screen name="ManualEntry" component={ManualEntryScreen} options={{ title: 'Enter manually' }} />
        <Stack.Screen
          name="Verdict"
          component={VerdictScreen}
          options={({ navigation }) => ({ title: 'Worth it?', ...headerButtons(navigation) })}
        />
        <Stack.Screen name="ListIt" component={ListItScreen} options={{ title: 'List it for sale' }} />
        <Stack.Screen name="History" component={HistoryScreen} options={{ title: 'Scan history' }} />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
