/**
 * Script para verificar saldos en la wallet
 * Desarrollado por Kadrez para la comunidad UltravioletaDAO
 * 
 * Este script permite verificar los saldos de AVAX, WAVAX y todos los tokens ERC20
 * de la lista de tokens conocidos KNOWN_TOKENS en la wallet especificada en la red de Avalanche.
 * 
 * @version 1.0.0
 * @license MIT
 */

// Importaciones necesarias
import {
  ChainId,
  WNATIVE,
  Token,
} from "@traderjoe-xyz/sdk-core";
import {
  createPublicClient,
  createWalletClient,
  http,
  formatUnits,
  getContract,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { avalanche } from "viem/chains";
import { config } from "dotenv";

// Configuración inicial
config();
const privateKey = process.env.PRIVATE_KEY;

// Asegurarse de que la clave privada tenga el formato correcto
const formattedPrivateKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;

const CHAIN_ID = ChainId.AVALANCHE;

try {
  // Crear la cuenta a partir de la clave privada
  const account = privateKeyToAccount(formattedPrivateKey);
  console.log(`=== Verificando saldos ===`);
  console.log(`Dirección de la wallet: ${account.address}`);
  console.log(`=======================================`);

  // Inicializar tokens
  const AVAX = WNATIVE[43114];
  const WAVAX = WNATIVE[CHAIN_ID];

  // Crear clientes Viem
  const publicClient = createPublicClient({
    chain: avalanche,
    transport: http(),
  });

  const walletClient = createWalletClient({
    account,
    chain: avalanche,
    transport: http(),
  });

  // ABI mínimo para tokens ERC20
  const ERC20_ABI = [
    {
      constant: true,
      inputs: [{ name: "_owner", type: "address" }],
      name: "balanceOf",
      outputs: [{ name: "", type: "uint256" }],
      type: "function",
    },
    {
      constant: true,
      inputs: [],
      name: "decimals",
      outputs: [{ name: "", type: "uint8" }],
      type: "function",
    },
    {
      constant: true,
      inputs: [],
      name: "symbol",
      outputs: [{ name: "", type: "string" }],
      type: "function",
    }
  ];

  // Lista de tokens conocidos en Avalanche
  const KNOWN_TOKENS = [
    {
      address: "0x281027C6a46142D6FC57f12665147221CE69Af33",
      symbol: "UVT",
      name: "UVT Token",
      decimals: 18
    },
    {
      address: "0x7698A5311DA174A95253Ce86C21ca7272b9B05f8",
      symbol: "WINK",
      name: "WINK Token",
      decimals: 18
    },
    {
      address: "0xFFFF003a6BAD9b743d658048742935fFFE2b6ED7",
      symbol: "KET",
      name: "KET Token",
      decimals: 18
    },
    {
      address: "0xa77d05fd853af120cD4dB48e73498E0cAbD3F628",
      symbol: "ERROR",
      name: "ERROR Token",
      decimals: 18
    }
  ];

  async function checkTokenBalance(tokenAddress) {
    try {
      // Verificar si el contrato existe
      const code = await publicClient.getBytecode({
        address: tokenAddress,
      });

      if (!code || code === '0x') {
        console.log(`Token ${tokenAddress} no es un contrato válido`);
        return null;
      }

      console.log(`Verificando contrato ${tokenAddress}`);

      // Leer balance directamente
      const balance = await publicClient.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [account.address],
      });

      // Leer decimals
      const decimals = await publicClient.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'decimals',
      });

      // Leer symbol
      const symbol = await publicClient.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'symbol',
      });

      const formattedBalance = formatUnits(balance, decimals);
      return {
        symbol,
        balance: formattedBalance,
        decimals
      };
    } catch (error) {
      console.log(`Error al acceder al token ${tokenAddress}: ${error.message}`);
      return null;
    }
  }

  async function checkAllBalances() {
    try {
      // Verificar balance de AVAX nativo
      const avaxBalance = await publicClient.getBalance({
        address: account.address,
      });
      console.log(`Saldo de AVAX: ${formatUnits(avaxBalance, 18)}`);

      // Verificar balance de WAVAX
      const wavaxBalance = await checkTokenBalance(WAVAX.address);
      if (wavaxBalance) {
        console.log(`Saldo de WAVAX: ${wavaxBalance.balance}`);
      }

      // Verificar balance de tokens conocidos
      console.log(`\nVerificando saldos de tokens conocidos...`);
      for (const token of KNOWN_TOKENS) {
        console.log(`\nVerificando ${token.symbol}...`);
        const balance = await checkTokenBalance(token.address);
        if (balance) {
          console.log(`Saldo de ${token.symbol}: ${balance.balance}`);
        } else {
          console.log(`No se pudo obtener el saldo de ${token.symbol}`);
        }
      }

      console.log(`\n=======================================`);
      console.log(`Verificación de saldos completada`);
    } catch (error) {
      console.error("Error al verificar saldos:", error);
      throw error;
    }
  }

  // Ejecutar la verificación de saldos
  checkAllBalances()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Error en el proceso principal:", error);
      process.exit(1);
    });
} catch (error) {
  console.error("Error al inicializar la cuenta:", error);
  process.exit(1);
} 