# Scripts de swap en LFJ para UltravioletaDAO

Scripts desarrollados por Kadrez para la comunidad UltravioletaDAO, permitiendo interactuar con SDK TraderJoe V2.2 en la red de Avalanche.

## Características

- Swap de AVAX nativo a TOKEN
- Swap de TOKEN a AVAX nativo
- Wrap AVAX
- Unwrap AVAX
- Verificación de saldos
- Configuración flexible a través de variables de entorno


## Requisitos Previos

- Node.js v16 o superior
- npm o yarn
- Una wallet con AVAX y tokens para swap

## Instalación

1. Clonar el repositorio:
```bash
git clone https://github.com/0xkadrez/uvdlfj.git
```

2. Instalar dependencias:
```bash
npm install
```

3. Configurar el archivo .env:
```bash
cp .env.example .env
```
Editar el archivo .env con tus configuraciones.

## Scripts Disponibles

### 1. Swap de AVAX a TOKEN
```bash
npm run swap-token
```
Este script permite intercambiar AVAX por el token especificado.

### 2. Swap de TOKEN a AVAX
```bash
npm run swap-avax
```
Este script permite intercambiar el token especificado por AVAX.

### 3. Verificación de Saldos
```bash
npm run balance
```
Este script muestra los saldos actuales de AVAX, WAVAX y el token especificado.

### 4. Wrap AVAX
```bash
npm run wrap <cantidad>
```
Este script permite convertir AVAX a WAVAX. Debes especificar la cantidad a envolver.

### 5. Unwrap AVAX
```bash
npm run unwrap <cantidad>
```
Este script permite convertir WAVAX a AVAX. Debes especificar la cantidad a desenvolver.

Ejemplos de uso:
```bash
# Envolver 1 AVAX a WAVAX
npm run wrap 1

# Desenvolver 1 WAVAX a AVAX
npm run unwrap 1

```

## Configuración del .env

El archivo .env permite configurar los siguientes parámetros:

### Configuración de Red
- `AVALANCHE_RPC_URL`: URL del RPC de Avalanche
- `CHAIN_ID`: ID de la red (43114 para Avalanche Mainnet)

### Configuración de Wallet
- `PRIVATE_KEY`: Tu clave privada

### Configuración de Tokens
- `WAVAX_ADDRESS`: Dirección del contrato WAVAX
- `TOKEN_ADDRESS`: Dirección del token a intercambiar
- `TOKEN_SYMBOL`: Símbolo del token
- `TOKEN_NAME`: Nombre del token

### Configuración de Trading
- `SLIPPAGE`: Tolerancia de deslizamiento (en base 10000, ej: 100 = 1%)
- `AVAX_AMOUNT`: Cantidad de AVAX para swap a TOKEN
- `TOKEN_AMOUNT`: Cantidad de TOKEN para swap a AVAX

### Configuración de Gas (Opcional)
- `GAS_LIMIT`: Límite de gas para las transacciones
- `MAX_FEE_PER_GAS`: Tarifa máxima por gas
- `MAX_PRIORITY_FEE_PER_GAS`: Tarifa de prioridad por gas

## Seguridad

- Nunca compartas tu clave privada
- No subas el archivo .env a git
- Mantén tus claves privadas seguras (una vez realices las transacciones necesarias borrala del .env)
- Verifica las direcciones de los contratos antes de interactuar


## TODO
- Encriptar clave privada con contraseña para no almacenarla en texto plano en .env
- Enviar AVAX/custom tokens a otras wallets
- Agregar multiples wallets para swap en paralelo

## Contribuciones
Si deseas contribuir realiza fork al repositorio, agrega las funcionalidades o correciones que veas convenientes y envia tu pull request.

## Documentación SDK LFJ
https://docs.lfj.gg/