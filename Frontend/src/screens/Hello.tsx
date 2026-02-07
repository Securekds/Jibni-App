import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../hooks/useAuth';
import Box from '../components/Box';
import Text from '../components/Text';
import Input from '../components/Input';
import Button from '../components/Button';
import { PhoneInput } from '../components';

export const HelloScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState("")
  const [isPhoneValid, setIsPhoneValid] = useState(false)
  const { login, isLoading } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const result = await login({ email, password });

    if (result.success) {
      Alert.alert('Success', `Welcome back, ${result.user?.name}!`);
      // Navigate to main app or dashboard
    } else {
      Alert.alert('Error', 'Login failed. Please check your credentials.');
    }
  };

  return (
    <Box
      flex={1}
      style={{
      }}
      justifyContent={'center'}
      paddingHorizontal={'m'}
    >
      <Text variant={'header'} textAlign={'center'} marginBottom={'l'}>
        Login
      </Text>
      <Input
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />
      <PhoneInput
        value={phone}
        onChangeText={({phone, isValid})=>{setPhone(phone); setIsPhoneValid(isValid)}}
      />

      <Input
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
      />
    <Button
      label='Se connecter'
      disabled={!isPhoneValid}
      onPress={handleLogin}
    />

    </Box>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#333',
  },
  input: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
