/**
 * Scripts de swap en LFJ
 * Desarrollado por Kadrez para la comunidad de UltravioletaDAO
 * 
 * Este script permite hacer unwrap de WAVAX a AVAX utilizando el SDK TraderJoe V2.2
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
  formatUnits,
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

// Obtener la cantidad a desenvolver desde los argumentos de línea de comandos
let amountToUnwrap = process.argv[2];

if (!amountToUnwrap) {
  console.log("Error: Debes especificar la cantidad de WAVAX a desenvolver.");
  console.log("Ejemplo: npm run unwrap 1.5");
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

  async function executeUnwrap() {
    try {
      console.log("=== Ejecutando unwrap de WAVAX a AVAX ===");
      console.log(`Dirección de la wallet: ${account.address}`);
      console.log("=======================================");
      
      // Obtener la dirección del contrato WAVAX
      const wavaxAddress = WAVAX.address;
      console.log(`Dirección del contrato WAVAX: ${wavaxAddress}`);
      
      // ABI mínimo para el contrato WAVAX (funciones withdraw y balanceOf)
      const wavaxAbi = [
        {
          constant: false,
          inputs: [{ name: "wad", type: "uint256" }],
          name: "withdraw",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
        {
          constant: true,
          inputs: [{ name: "account", type: "address" }],
          name: "balanceOf",
          outputs: [{ name: "", type: "uint256" }],
          stateMutability: "view",
          type: "function",
        }
      ];
      
      // Verificar el balance de WAVAX
      const wavaxBalance = await publicClient.readContract({
        address: wavaxAddress,
        abi: wavaxAbi,
        functionName: "balanceOf",
        args: [account.address],
      });
      
      const formattedBalance = formatUnits(wavaxBalance, 18);
      console.log(`Balance actual de WAVAX: ${formattedBalance} WAVAX`);
      
      if (wavaxBalance <= BigInt(0)) {
        console.log("No hay WAVAX para desenvolver. Operación cancelada.");
        return null;
      }
      
      // Determinar la cantidad a desenvolver
      let unwrapAmount;
      
      if (amountToUnwrap) {
        // Convertir la cantidad especificada a wei
        unwrapAmount = parseUnits(amountToUnwrap, 18);
        
        // Verificar que la cantidad no exceda el balance disponible
        if (unwrapAmount > wavaxBalance) {
          console.log(`La cantidad especificada (${amountToUnwrap} WAVAX) excede el balance disponible (${formattedBalance} WAVAX).`);
          console.log(`Se desenvolverá el balance completo: ${formattedBalance} WAVAX.`);
          unwrapAmount = wavaxBalance;
        }
      } else {
        // Si no se especificó una cantidad, desenvolver todo el balance
        unwrapAmount = wavaxBalance;
        console.log("No se especificó una cantidad. Se desenvolverá todo el balance disponible.");
      }
      
      const formattedUnwrapAmount = formatUnits(unwrapAmount, 18);
      console.log(`Desenvolviendo ${formattedUnwrapAmount} WAVAX a AVAX nativo`);
      
      console.log("Enviando transacción para desenvolver WAVAX...");
      // Llamar a la función withdraw del contrato WAVAX
      const hash = await walletClient.writeContract({
        address: wavaxAddress,
        abi: wavaxAbi,
        functionName: "withdraw",
        args: [unwrapAmount],
      });
      
      console.log(`Transacción enviada con hash ${hash}`);
      console.log(`Puedes verificar la transacción en: https://snowtrace.io/tx/${hash}`);
      
      return hash;
    } catch (error) {
      console.error("Error al desenvolver WAVAX:", error);
      
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

  // Ejecutar la función para desenvolver WAVAX en AVAX
  executeUnwrap()
    .then((hash) => {
      if (hash) {
        console.log("=======================================");
        console.log("Unwrap completado con éxito:", hash);
      }
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