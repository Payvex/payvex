import { Layout, Text } from '@ui-kitten/components';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { LogoShowcase } from '../components/avatar_gataway/avatar_gatway';
import { StatusBadge } from '../components/status/status_badge';
import { ButtonIntegration } from '../components/Button/button_integrations';

const STRIPE_STORAGE_KEY = 'payvex_gateway_stripe';
const MERCADO_PAGO_STORAGE_KEY = 'payvex_gateway_mercado_pago';
const WOOCOMMERCE_STORAGE_KEY = 'payvex_gateway_woocommerce';
const NUVEM_SHOP_STORAGE_KEY = 'payvex_gateway_nuvemshop';
const SHOPIFY_STORAGE_KEY = 'payvex_gateway_shopify';

type GatewayStatus = 'DISCONNECTED' | 'CONNECTED';

interface GatewayItem {
  gatewayName: string;
  status: GatewayStatus;
}

const INITIAL_GATEWAYS: GatewayItem[] = [
  { gatewayName: 'Stripe', status: 'DISCONNECTED' },
  { gatewayName: 'Mercado Pago', status: 'DISCONNECTED' },
  { gatewayName: 'WooCommerce', status: 'DISCONNECTED' },
  { gatewayName: 'Nuvem Shop', status: 'DISCONNECTED' },
  { gatewayName: 'Shopify', status: 'DISCONNECTED' },
  { gatewayName: 'Pagarme.me', status: 'DISCONNECTED' },
];

const IntegrationScreen = () => {
  const [gateways, setGateways] = useState<GatewayItem[]>(INITIAL_GATEWAYS);
  const [stripeKey, setStripeKey] = useState('');
  const [stripeLoading, setStripeLoading] = useState(false);
  const [mpKey, setMpKey] = useState('');
  const [mpLoading, setMpLoading] = useState(false);

  const readSaved = async (key: string) => {
    try {
      return (await SecureStore.getItemAsync(key)) || '';
    } catch {
      return '';
    }
  };

  React.useEffect(() => {
    (async () => {
      const [savedStripe, savedMp] = await Promise.all([
        readSaved(STRIPE_STORAGE_KEY),
        readSaved(MERCADO_PAGO_STORAGE_KEY),
      ]);

      if (savedStripe) {
        setStripeKey(savedStripe);
        setGateways((prev) =>
          prev.map((item) =>
            item.gatewayName === 'Stripe' ? { ...item, status: 'CONNECTED' } : item,
          ),
        );
      }

      if (savedMp) {
        setMpKey(savedMp);
        setGateways((prev) =>
          prev.map((item) =>
            item.gatewayName === 'Mercado Pago'
              ? { ...item, status: 'CONNECTED' }
              : item,
          ),
        );
      }
    })();
  }, []);

  const connectStripe = async () => {
    const secret = stripeKey.trim();
    if (!secret) {
      Alert.alert('Atenção', 'Informe a chave secreta do Stripe.');
      return;
    }

    setStripeLoading(true);
    try {
      const response = await fetch('https://api.stripe.com/v1/account', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${secret}`,
        },
      });

      const json = (await response.json()) as any;

      if (!response.ok) {
        Alert.alert('Falha', json?.error?.message || 'Chave do Stripe inválida.');
        return;
      }

      await SecureStore.setItemAsync(STRIPE_STORAGE_KEY, secret);

      setGateways((prev) =>
        prev.map((item) =>
          item.gatewayName === 'Stripe' ? { ...item, status: 'CONNECTED' } : item,
        ),
      );

      Alert.alert('Stripe', 'Conta conectada com sucesso.');
    } catch {
      Alert.alert('Falha', 'Não foi possível validar o Stripe agora.');
    } finally {
      setStripeLoading(false);
    }
  };

  const disconnectStripe = async () => {
    await SecureStore.deleteItemAsync(STRIPE_STORAGE_KEY);
    setStripeKey('');
    setGateways((prev) =>
      prev.map((item) =>
        item.gatewayName === 'Stripe' ? { ...item, status: 'DISCONNECTED' } : item,
      ),
    );
  };

  const connectMercadoPago = async () => {
    const token = mpKey.trim();
    if (!token) {
      Alert.alert('Atenção', 'Informe o token do Mercado Pago.');
      return;
    }

    setMpLoading(true);
    try {
      const response = await fetch('https://api.mercadopago.com/users/me', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const json = (await response.json()) as any;

      if (!response.ok) {
        Alert.alert(
          'Falha',
          typeof json?.message === 'string'
            ? json.message
            : 'Token do Mercado Pago inválido.',
        );
        return;
      }

      await SecureStore.setItemAsync(MERCADO_PAGO_STORAGE_KEY, token);

      setGateways((prev) =>
        prev.map((item) =>
          item.gatewayName === 'Mercado Pago'
            ? { ...item, status: 'CONNECTED' }
            : item,
        ),
      );

      const nickname = json?.nickname || 'Conta conectada';
      Alert.alert('Mercado Pago', `Conta conectada: ${nickname}`);
    } catch {
      Alert.alert('Falha', 'Não foi possível validar o Mercado Pago agora.');
    } finally {
      setMpLoading(false);
    }
  };

  const disconnectMercadoPago = async () => {
    await SecureStore.deleteItemAsync(MERCADO_PAGO_STORAGE_KEY);
    setMpKey('');
    setGateways((prev) =>
      prev.map((item) =>
        item.gatewayName === 'Mercado Pago'
          ? { ...item, status: 'DISCONNECTED' }
          : item,
      ),
    );
  };

  return (
    <Layout style={styles.layoutStyle}>
      <StatusBar style="dark" backgroundColor="transparent" translucent />

      <View style={styles.headerContainer}>
        <Text category="h4" style={styles.title}>
          Integrações
        </Text>
        <Text appearance="hint" style={styles.subtitle}>
          Gerencie suas conexões com gateways de pagamento.
        </Text>
      </View>

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        <Text category="h6" style={styles.sectionTitle}>
          Minha Conexão Ativa
        </Text>
        {gateways
          .filter((item) => item.status === 'CONNECTED')
          .map((item) => (
            <View key={item.gatewayName} style={styles.activeCard}>
              <View style={styles.activeRow}>
                <Text category="s1">{item.gatewayName}</Text>
                <StatusBadge text="CONECTADO" status="success" />
              </View>
              <Text appearance="hint" style={styles.activeMeta}>
                Status atual: ativo
              </Text>
            </View>
          ))}

        {gateways.filter((item) => item.status === 'CONNECTED').length === 0 ? (
          <Text appearance="hint" style={styles.emptyState}>
            Nenhum gateway conectado no momento.
          </Text>
        ) : null}

        <Text category="h6" style={styles.sectionTitle}>
          Gateways Disponíveis
        </Text>

        {gateways.map((item) => {
          const isConnected = item.status === 'CONNECTED';

          if (item.gatewayName === 'Stripe') {
            return (
              <View key={item.gatewayName} style={styles.cardItem}>
                <View style={styles.cardRow}>
                  <Text category="s1">{item.gatewayName}</Text>
                  <StatusBadge
                    text={isConnected ? 'CONECTADO' : 'DESCONECTADO'}
                    status={isConnected ? 'success' : 'warning'}
                  />
                </View>
                <Text appearance="hint" style={styles.cardDescription}>
                  {isConnected
                    ? 'Integração ativa com a sua conta Stripe.'
                    : 'Use a chave secreta para conectar.'}
                </Text>
                <TextInput
                  value={stripeKey}
                  onChangeText={setStripeKey}
                  placeholder="sk_live_... ou sk_test_..."
                  style={styles.rowInput}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <ButtonIntegration
                  loading={stripeLoading}
                  label={isConnected ? 'Desconectar' : 'Conectar'}
                  onPress={isConnected ? disconnectStripe : connectStripe}
                />
              </View>
            );
          }

          if (item.gatewayName === 'Mercado Pago') {
            return (
              <View key={item.gatewayName} style={styles.cardItem}>
                <View style={styles.cardRow}>
                  <Text category="s1">{item.gatewayName}</Text>
                  <StatusBadge
                    text={isConnected ? 'CONECTADO' : 'DESCONECTADO'}
                    status={isConnected ? 'success' : 'warning'}
                  />
                </View>
                <Text appearance="hint" style={styles.cardDescription}>
                  {isConnected
                    ? 'Integração ativa com o Mercado Pago.'
                    : 'Use o token de acesso para validar a conexão.'}
                </Text>
                <TextInput
                  value={mpKey}
                  onChangeText={setMpKey}
                  placeholder="APP_USR-..."
                  style={styles.rowInput}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <ButtonIntegration
                  loading={mpLoading}
                  label={isConnected ? 'Desconectar' : 'Conectar'}
                  onPress={
                    isConnected ? disconnectMercadoPago : connectMercadoPago
                  }
                />
              </View>
            );
          }

          if (item.gatewayName === 'Pagarme.me') {
            return (
              <View key={item.gatewayName} style={styles.cardItem}>
                <View style={styles.cardRow}>
                  <Text category="s1">{item.gatewayName}</Text>
                  <StatusBadge
                    text={isConnected ? 'CONECTADO' : 'DESCONECTADO'}
                    status={isConnected ? 'success' : 'warning'}
                  />
                </View>
                <Text appearance="hint" style={styles.cardDescription}>
                  {isConnected
                    ? 'Essa integração está ativa.'
                    : 'Essa conexão será liberada em instantes.'}
                </Text>
                <ButtonIntegration
                  onPress={() =>
                    Alert.alert('Em breve', 'Essa conexão será liberada em instantes.')
                  }
                  label="Conectar"
                />
              </View>
            );
          }

          return null;
        })}

        <View style={styles.sectionFooter}>
          <Text category="s2" style={styles.footerTitle}>
            Precisa de ajuda?
          </Text>
          <Text
            category="h6"
            style={styles.footerLink}
            onPress={() =>
              Linking.openURL('https://github.com').catch(() => {
                Alert.alert('Falha', 'Não foi possível abrir o link de ajuda.');
              })
            }
          >
            Ver documentação de integração
          </Text>
        </View>

        <View style={styles.devSection}>
          <Text category="s2" style={styles.devTitle}>
            Integrações em desenvolvimento
          </Text>
          <LogoShowcase />
        </View>
      </ScrollView>
    </Layout>
  );
};

export default IntegrationScreen;

const styles = StyleSheet.create({
  layoutStyle: {
    flex: 1,
    flexDirection: 'column',
  },
  headerContainer: {
    paddingTop: Constants.statusBarHeight + 16,
    paddingHorizontal: 16,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  title: {
    marginBottom: 4,
  },
  subtitle: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginTop: 20,
    marginBottom: 8,
  },
  sectionFooter: {
    marginTop: 20,
    gap: 6,
  },
  footerTitle: {
    marginBottom: 4,
  },
  footerLink: {
    color: '#3A416F',
    textDecorationLine: 'underline',
  },
  activeCard: {
    marginVertical: 5,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E4E9F2',
    borderRadius: 8,
    backgroundColor: '#F6F8FB',
  },
  activeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activeMeta: {
    marginTop: 6,
  },
  emptyState: {
    marginTop: 4,
    marginBottom: 12,
  },
  cardItem: {
    padding: 16,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#E4E9F2',
    borderRadius: 8,
    gap: 10,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardDescription: {
    marginTop: 2,
  },
  rowInput: {
    borderWidth: 1,
    borderColor: '#E4E9F2',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  devSection: {
    marginTop: 20,
    gap: 8,
  },
  devTitle: {
    marginBottom: 4,
  },
});
