import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MenuScreen from '../screens/MenuScreen';
import ScannerScreen from '../screens/ScannerScreen';
import GenerateScreen from '../screens/GenerateScreen';
import SettingsScreen from '../screens/SettingsScreen';

export type RootStackParamList = {
    Menu: undefined;
    Scanner: undefined;
    Generate: undefined;
    Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
    return (
        <NavigationContainer>
            <Stack.Navigator
                initialRouteName="Menu"
                screenOptions={{
                    headerShown: false,
                    animation: 'fade', // Transición suave acorde al Glassmorphism
                }}
            >
                <Stack.Screen name="Menu" component={MenuScreen} />
                <Stack.Screen name="Scanner" component={ScannerScreen} />
                <Stack.Screen name="Generate" component={GenerateScreen} />
                <Stack.Screen name="Settings" component={SettingsScreen} />
            </Stack.Navigator>
        </NavigationContainer>
    );
}
