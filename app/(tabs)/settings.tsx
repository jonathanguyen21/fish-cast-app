import { View, Text } from 'react-native';
import { Colors } from '../../theme/colors';

export default function SettingsScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: Colors.textPrimary, fontSize: 18 }}>Settings Screen</Text>
    </View>
  );
}
