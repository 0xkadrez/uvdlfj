/**
 * Scripts de swap en LFJ
 * Desarrollado por Kadrez para la comunidad de UltravioletaDAO
 * 
 * Este script permite hacer wrap de AVAX a WAVAX utilizando el SDK TraderJoe V2.2
 * en la red de Avalanche.
 * 
 * @version 1.0.0
 * @license MIT
 */

// Importaciones necesarias
import {
  ChainId,
  WNATIVE,
  Token,
  TokenAmount,
  Percent,
} from "@traderjoe-xyz/sdk-core";
import pkg from "@traderjoe-xyz/sdk-v2";
const {
  PairV2,
  RouteV2,
  TradeV2,
  LB_ROUTER_V22_ADDRESS,
  jsonAbis,
} = pkg;
import {
  createPublicClient,
  createWalletClient,
  http,
  parseUnits,
  BaseError,
  ContractFunctionRevertedError,
  hexToBytes,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { avalanche } from "viem/chains";
import { config } from "dotenv";

// Configuración inicial
config();
const privateKey = process.env.PRIVATE_KEY;

// Asegurarse de que la clave privada tenga el formato correcto
// La clave privada debe ser una cadena hexadecimal con el prefijo '0x'
const formattedPrivateKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;

const { LBRouterV22ABI } = jsonAbis;
const CHAIN_ID = ChainId.AVALANCHE;
const router = LB_ROUTER_V22_ADDRESS[CHAIN_ID];

// Obtener la cantidad a envolver desde los argumentos de línea de comandos
let amountToWrap = process.argv[2];

if (!amountToWrap) {
  console.log("Error: Debes especificar la cantidad de AVAX a envolver.");
  console.log("Ejemplo: npm run wrap 1");
  process.exit(1);
}

try {
  // Crear la cuenta a partir de la clave privada
  const account = privateKeyToAccount(formattedPrivateKey);
  console.log(`Cuenta creada con éxito: ${account.address}`);

  // Inicializar tokens
  const AVAX = WNATIVE[43114];
  const WAVAX = WNATIVE[CHAIN_ID]; // Instancia de Token para WAVAX
  const UVT = new Token(
    CHAIN_ID,
    "0x281027C6a46142D6FC57f12665147221CE69Af33",
    18,
    "UVT",
    "UVT Token"
  );

  // Declarar bases utilizadas para generar rutas de intercambio
  const BASES = [AVAX, WAVAX, UVT];

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

  async function executeSwap() {
    try {
      console.log("=== Ejecutando wrap de AVAX a WAVAX ===");
      console.log(`Dirección de la wallet: ${account.address}`);
      console.log(`Dirección del Router: ${router}`);
      console.log("=======================================");
      
      console.log(`Envolviendo ${amountToWrap} AVAX en WAVAX`);
      
      // Convertir a wei
      const amountInWei = parseUnits(amountToWrap, 18);
      
      // Obtener la dirección del contrato WAVAX
      const wavaxAddress = WAVAX.address;
      console.log(`Dirección del contrato WAVAX: ${wavaxAddress}`);
      
      // ABI mínimo para el contrato WAVAX (solo la función deposit)
      const wavaxAbi = [
        {
          constant: false,
          inputs: [],
          name: "deposit",
          outputs: [],
          stateMutability: "payable",
          type: "function",
        }
      ];
      
      console.log("Enviando transacción para envolver AVAX...");
      // Llamar a la función deposit del contrato WAVAX
      const hash = await walletClient.writeContract({
        address: wavaxAddress,
        abi: wavaxAbi,
        functionName: "deposit",
        value: amountInWei,
      });
      
      console.log(`Transacción enviada con hash ${hash}`);
      console.log(`Puedes verificar la transacción en: https://snowtrace.io/tx/${hash}`);
      
      return hash;
    } catch (error) {
      console.error("Error al envolver AVAX:", error);
      
      // Manejo específico de errores
      if (error instanceof BaseError) {
        console.error("Error de Viem:", error.message);
        
        if (error instanceof ContractFunctionRevertedError) {
          console.error("La transacción fue revertida por el contrato:", error.data);
        }
      }
      
      throw error;
    }
  }

  // Ejecutar la función para envolver AVAX en WAVAX
  executeSwap()
    .then((hash) => {
      console.log("=======================================");
      console.log("Swap completado con éxito:", hash);
      process.exit(0);
    })
    .catch((error) => {
      console.error("=======================================");
      console.error("Error en el proceso principal:", error);
      process.exit(1);
    });
} catch (error) {
  console.error("Error al inicializar la cuenta:", error);
  process.exit(1);
} 