/**
 * Scripts de swap en LFJ
 * Desarrollado por Kadrez para la comunidad de UltravioletaDAO
 * 
 * Este script permite realizar swap de AVAX a otro TOKEN especifico utilizando el SDK TraderJoe V2.2
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

// Obtener la configuración del token desde las variables de entorno
const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS;
const TOKEN_SYMBOL = process.env.TOKEN_SYMBOL;
const TOKEN_NAME = process.env.TOKEN_NAME;
const SLIPPAGE = process.env.SLIPPAGE;
const AVAX_AMOUNT = process.env.AVAX_AMOUNT;
const GAS_LIMIT = process.env.GAS_LIMIT;
const MAX_FEE_PER_GAS = process.env.MAX_FEE_PER_GAS || 5000000000; // 5 Gwei por defecto si no está en el .env
const MAX_PRIORITY_FEE_PER_GAS = process.env.MAX_PRIORITY_FEE_PER_GAS || 5000000000; // 5 Gwei por defecto si no está en el .env

try {
  // Crear la cuenta a partir de la clave privada
  const account = privateKeyToAccount(formattedPrivateKey);
  console.log(`Cuenta creada con éxito: ${account.address}`);

  // Inicializar tokens
  const AVAX = WNATIVE[43114];
  const WAVAX = WNATIVE[CHAIN_ID]; // Instancia de Token para WAVAX
  const OUTPUT_TOKEN = new Token(
    CHAIN_ID,
    TOKEN_ADDRESS,
    18,
    TOKEN_SYMBOL,
    TOKEN_NAME
  );

  // Declarar bases utilizadas para generar rutas de intercambio
  const BASES = [AVAX, WAVAX, OUTPUT_TOKEN];

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

  async function executeExactSwapInAVAXtoToken() {
    try {
      console.log(`=== Ejecutando swap exacto de entrada: AVAX nativo a ${TOKEN_SYMBOL} ===`);
      console.log(`Dirección de la wallet: ${account.address}`);
      console.log(`Dirección del Router: ${router}`);
      console.log(`Dirección del Token: ${TOKEN_ADDRESS}`);
      console.log("=======================================");
      
      // Token de entrada en el intercambio (WAVAX, pero usaremos AVAX nativo)
      const inputToken = WAVAX;

      // Token de salida en el intercambio
      const outputToken = OUTPUT_TOKEN;

      // Especificar si el usuario proporcionó un valor exacto de entrada o salida
      const isExactIn = true;

      // Cantidad de AVAX desde el .env
      const typedValueIn = AVAX_AMOUNT;
      console.log(`Intercambiando ${typedValueIn} AVAX nativo por ${TOKEN_SYMBOL} (cantidad exacta de entrada)`);

      // Convertir la entrada del usuario a la precisión decimal del token de entrada (18 para AVAX)
      const typedValueInParsed = parseUnits(typedValueIn, inputToken.decimals);

      // Envolver en TokenAmount
      const amountIn = new TokenAmount(inputToken, typedValueInParsed);

      console.log("Generando pares de tokens...");
      // Obtener todas las combinaciones [Token, Token]
      const allTokenPairs = PairV2.createAllTokenPairs(
        inputToken,
        outputToken,
        BASES
      );

      console.log("Inicializando pares...");
      // Inicializar instancias de PairV2 para los pares [Token, Token]
      const allPairs = PairV2.initPairs(allTokenPairs);

      console.log("Creando rutas posibles...");
      // Generar todas las rutas posibles a considerar
      const allRoutes = RouteV2.createAllRoutes(allPairs, inputToken, outputToken);
      console.log(`Se encontraron ${allRoutes.length} rutas posibles`);

      // Para AVAX nativo, usamos isNativeIn = true
      const isNativeIn = true; // 'true' porque usamos AVAX nativo
      const isNativeOut = false; // 'false' porque el token de salida no es nativo

      console.log("Obteniendo cotizaciones para todas las rutas...");
      // Generar todas las instancias posibles de TradeV2
      const trades = await TradeV2.getTradesExactIn(
        allRoutes,
        amountIn,
        outputToken,
        isNativeIn,
        isNativeOut,
        publicClient,
        CHAIN_ID
      );
      console.log(`Se obtuvieron ${trades.length} cotizaciones`);

      // Elegir el mejor intercambio
      const bestTrade = TradeV2.chooseBestTrade(trades, isExactIn);
      console.log("Se seleccionó la mejor ruta de intercambio");

      // Imprimir información útil sobre el intercambio
      console.log("Detalles del intercambio:");
      console.log(bestTrade.toLog());

      // Obtener información de tarifas del intercambio
      const { totalFeePct, feeAmountIn } = await bestTrade.getTradeFee();
      console.log("Porcentaje total de tarifas:", totalFeePct.toSignificant(6), "%");
      console.log(`Tarifa: ${feeAmountIn.toSignificant(6)} ${feeAmountIn.token.symbol}`);

      // Establecer tolerancia de deslizamiento
      const userSlippageTolerance = new Percent(SLIPPAGE, "10000"); // 9000/10000 = 0.9% (90%)
      console.log(`Slippage configurado: ${userSlippageTolerance.toSignificant(4)}%`);

      // Establecer opciones de intercambio
      const swapOptions = {
        allowedSlippage: userSlippageTolerance,
        ttl: 3600, // 1 hora
        recipient: account.address,
        feeOnTransfer: false,
      };

      console.log("Generando parámetros para la llamada al contrato...");
      // Generar método y parámetros de intercambio para la llamada al contrato
      const {
        methodName,
        args,
        value,
      } = bestTrade.swapCallParameters(swapOptions);
      
      console.log(`Método a llamar: ${methodName}`);
      console.log(`Valor a enviar: ${value}`);

      console.log("Enviando transacción...");
      // Ejecutar la transacción
      const hash = await walletClient.writeContract({
        address: router,
        abi: LBRouterV22ABI,
        functionName: methodName,
        args: args,
        value: BigInt(value),
        gas: BigInt(GAS_LIMIT),
        maxFeePerGas: BigInt(MAX_FEE_PER_GAS),
        maxPriorityFeePerGas: BigInt(MAX_PRIORITY_FEE_PER_GAS),
      });
      console.log(`Transacción enviada con hash ${hash}`);
      console.log(`Puedes verificar la transacción en: https://snowtrace.io/tx/${hash}`);

      return hash;
    } catch (error) {
      console.error("Error al ejecutar el swap:", error);
      
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

  // Ejecutar la función para swap con cantidad exacta de entrada
  executeExactSwapInAVAXtoToken()
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