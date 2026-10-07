import { Platform, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { TabBarIcon } from '@/src/components/TabBarIcon';
import { colors } from '@/src/constants/colors';
import { typography } from '@/src/constants/typography';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ focused }) => <TabBarIcon name="home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="qr"
        options={{
          title: 'QR',
          tabBarIcon: ({ focused }) => <TabBarIcon name="qr" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="pagos"
        options={{
          title: 'Pagos',
          tabBarIcon: ({ focused }) => <TabBarIcon name="receipt" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="mas"
        options={{
          title: 'Más',
          tabBarIcon: ({ focused }) => <TabBarIcon name="menu" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: Platform.OS === 'ios' ? 18 : 12,
    height: 70,
    paddingTop: 8,
    paddingBottom: 8,
    borderTopWidth: 0,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.96)',
    shadowColor: '#000',
    shadowOpacity: 0.13,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  tabItem: {
    paddingTop: 1,
  },
  tabLabel: {
    fontSize: 10.5,
    fontWeight: typography.weights.bold,
    marginTop: 3,
  },
});
