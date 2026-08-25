import { Layout, Text } from '@ui-kitten/components';
import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';

type ButtonIntegrationProps = {
  onPress?: () => void;
  loading?: boolean;
  label?: string;
};

export const ButtonIntegration = ({
  onPress,
  loading = false,
  label = 'conectar',
}: ButtonIntegrationProps) => (
  <Layout style={styles.container} level="1">
    <TouchableOpacity onPress={onPress} disabled={loading}>
      <Layout style={styles.button}>
        <Text>{loading ? 'Validando...' : label}</Text>
      </Layout>
    </TouchableOpacity>
  </Layout>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  button: {
    margin: 2,
    backgroundColor: '#3A416F',
    color: '#3A416F',
    borderColor: '#3A416F',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
});
