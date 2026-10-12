// ==========================================
// CONFIGURAZIONE DELLA CURVA GIOCATTOLO
// ==========================================

const primeField = 17;
let activeBaseNode = { x: 1, y: 5 }; 
let haltExecution = false;

// Colori autunnali per il canvas
const COL_BASE_DOT = '#d7ccc8';
const COL_GEN_NODE = '#e65100';
const COL_JUMP_PATH = '#c0392b';
const COL_FINAL_KEY = '#558b2f';

// ==========================================
// MATEMATICA DEL CAMPO FINITO
// ==========================================

function safeModulo(val, modulus) { 
    return ((val % modulus) + modulus) % modulus; 
}

function findModularInverse(val, modulus) {
    val = safeModulo(val, modulus);
    for (let iterator = 1; iterator < modulus; iterator++) {
        if (safeModulo(val * iterator, modulus) === 1) return iterator;
    }
    return 1;
}

function computeCurveDomain() {
    let validNodes = [];
    for (let absX = 0; absX < primeField; absX++) {
        let rightEq = safeModulo(absX * absX * absX + 7, primeField);
        for (let absY = 0; absY < primeField; absY++) {
            let leftEq = safeModulo(absY * absY, primeField);
            if (leftEq === rightEq) { 
                validNodes.push({x: absX, y: absY}); 
            }
        }
    }
    return validNodes;
}

const domainPoints = computeCurveDomain();

window.onload = function() {
    const dropdown = document.getElementById('generatorSelect');
    domainPoints.forEach(node => {
        let opt = document.createElement('option');
        opt.value = `${node.x},${node.y}`;
        opt.text = `(${node.x}, ${node.y})`;
        if(node.x === 1 && node.y === 5) opt.selected = true;
        dropdown.appendChild(opt);
    });
    renderCoordinateSystem();
    plotCoordinate(activeBaseNode, COL_GEN_NODE, 8);
};

// ==========================================
// LOGICA DELLA CURVA ELLITTICA
// ==========================================

function addEllipticPoints(nodeA, nodeB) {
    if (nodeA === null) return { resultant: nodeB, logs: "Identity addition (Infinity)." };
    if (nodeB === null) return { resultant: nodeA, logs: "Identity addition (Infinity)." };

    if (nodeA.x === nodeB.x && nodeA.y === safeModulo(-nodeB.y, primeField)) {
        return { resultant: null, logs: "Points are inverses. Result is Infinity (O)." };
    }

    let lambdaSlope, logsData;
    
    if (nodeA.x === nodeB.x && nodeA.y === nodeB.y) {
        let numerator = safeModulo(3 * nodeA.x * nodeA.x, primeField);
        let denominator = findModularInverse(2 * nodeA.y, primeField);
        lambdaSlope = safeModulo(numerator * denominator, primeField);
        logsData = `Point Doubling operation.\n   Tangent λ = (3x²)/2y mod ${primeField} = ${lambdaSlope}`;
    } else {
        let numerator = safeModulo(nodeB.y - nodeA.y, primeField);
        let denominator = findModularInverse(nodeB.x - nodeA.x, primeField);
        lambdaSlope = safeModulo(numerator * denominator, primeField);
        logsData = `Point Addition operation.\n   Line λ = (y₂-y₁)/(x₂-x₁) mod ${primeField} = ${lambdaSlope}`;
    }

    let xRes = safeModulo(lambdaSlope * lambdaSlope - nodeA.x - nodeB.x, primeField);
    let yRes = safeModulo(lambdaSlope * (nodeA.x - xRes) - nodeA.y, primeField);
    
    return { resultant: { x: xRes, y: yRes }, logs: logsData + `\n   Yield: x₃ = ${xRes}, y₃ = ${yRes}` };
}

function compileScalarSequence(scalarMultiplier) {
    let sequenceArray = [];
    let traversingNode = activeBaseNode;
    sequenceArray.push({ mult: 1, coord: traversingNode, info: "Base Generator Node established." });
    
    for(let iter = 2; iter <= scalarMultiplier; iter++) {
        let calcResult = addEllipticPoints(traversingNode, activeBaseNode);
        traversingNode = calcResult.resultant;
        sequenceArray.push({ mult: iter, coord: traversingNode, info: calcResult.logs });
    }
    return sequenceArray;
}

// ==========================================
// RENDER DEL CANVAS (Grafica Animata)
// ==========================================

const cryptoCanvas = document.getElementById('cryptoCanvas');
const renderCtx = cryptoCanvas.getContext('2d');
const gridScale = cryptoCanvas.width / primeField;

function renderCoordinateSystem() {
    renderCtx.clearRect(0, 0, cryptoCanvas.width, cryptoCanvas.height);
    renderCtx.strokeStyle = '#f0e6dc';
    renderCtx.lineWidth = 1.5;
    
    for (let idx = 0; idx <= primeField; idx++) {
        renderCtx.beginPath(); renderCtx.moveTo(idx * gridScale, 0); renderCtx.lineTo(idx * gridScale, cryptoCanvas.height); renderCtx.stroke();
        renderCtx.beginPath(); renderCtx.moveTo(0, idx * gridScale); renderCtx.lineTo(cryptoCanvas.width, idx * gridScale); renderCtx.stroke();
    }
    
    renderCtx.fillStyle = COL_BASE_DOT;
    domainPoints.forEach(node => plotCoordinate(node, COL_BASE_DOT, 4));
}

function plotCoordinate(nodeObj, hexColor, radSize = 5) {
    if (!nodeObj) return; 
    const mappedX = nodeObj.x * gridScale + gridScale/2;
    const mappedY = cryptoCanvas.height - (nodeObj.y * gridScale + gridScale/2);
    
    renderCtx.beginPath();
    renderCtx.arc(mappedX, mappedY, radSize, 0, 2 * Math.PI);
    renderCtx.fillStyle = hexColor;
    renderCtx.fill();
}

function connectVertices(node1, node2, hexColor) {
    if (!node1 || !node2) return;
    const mx1 = node1.x * gridScale + gridScale/2;
    const my1 = cryptoCanvas.height - (node1.y * gridScale + gridScale/2);
    const mx2 = node2.x * gridScale + gridScale/2;
    const my2 = cryptoCanvas.height - (node2.y * gridScale + gridScale/2);
    
    renderCtx.beginPath();
    renderCtx.moveTo(mx1, my1);
    renderCtx.lineTo(mx2, my2);
    renderCtx.strokeStyle = hexColor;
    renderCtx.lineWidth = 2.5;
    renderCtx.setLineDash([5, 7]);
    renderCtx.stroke();
    renderCtx.setLineDash([]);
}

// ==========================================
// GESTIONE DEI PULSANTI
// ==========================================

function refreshStartNode() {
    if (haltExecution || document.getElementById('outputTerminal').innerHTML.includes("System online")) {
        let dropdownVals = document.getElementById('generatorSelect').value.split(',');
        activeBaseNode = { x: parseInt(dropdownVals[0]), y: parseInt(dropdownVals[1]) };
        renderCoordinateSystem();
        plotCoordinate(activeBaseNode, COL_GEN_NODE, 8);
    }
}

function abortCalculation() { 
    haltExecution = true; 
}

function clearCryptoState() {
    haltExecution = true;
    document.getElementById('outputTerminal').innerHTML = "> System reset.\n> Select parameters and Compute.";
    let dropdownVals = document.getElementById('generatorSelect').value.split(',');
    activeBaseNode = { x: parseInt(dropdownVals[0]), y: parseInt(dropdownVals[1]) };
    renderCoordinateSystem();
    plotCoordinate(activeBaseNode, COL_GEN_NODE, 8);
}

async function launchCryptoSequence() {
    haltExecution = false;
    
    let dropdownVals = document.getElementById('generatorSelect').value.split(',');
    activeBaseNode = { x: parseInt(dropdownVals[0]), y: parseInt(dropdownVals[1]) };

    let secretKeyVal = parseInt(document.getElementById('secretScalar').value);
    if(isNaN(secretKeyVal) || secretKeyVal < 1) secretKeyVal = 1;
    
    const terminalScreen = document.getElementById('outputTerminal');
    terminalScreen.innerHTML = `<span style="color:var(--fall-gold);"># Parameters Loaded</span>\nCurve Modulus: ${primeField}\nGen Pt = (${activeBaseNode.x}, ${activeBaseNode.y})\nMultiplier k = ${secretKeyVal}\n\n<span style="color:var(--fall-orange);">> Initiating multiplication logic...</span>\n\n`;
    
    renderCoordinateSystem();
    plotCoordinate(activeBaseNode, COL_GEN_NODE, 8);

    let computationalSteps = compileScalarSequence(secretKeyVal);
    let historyNode = null;

    for (let st = 0; st < computationalSteps.length; st++) {
        if (haltExecution) {
            terminalScreen.innerHTML += `<strong style="color:var(--fall-red);">\n[PROCESS HALTED BY USER]</strong>\n`;
            terminalScreen.scrollTop = terminalScreen.scrollHeight;
            break;
        }

        let currentPhase = computationalSteps[st];
        let formattedPt = currentPhase.coord ? `(${currentPhase.coord.x}, ${currentPhase.coord.y})` : 'O (Infinity)';
        
        terminalScreen.innerHTML += `<strong style="color:#ffffff;">[Step ${currentPhase.mult}] ${currentPhase.mult}G = ${formattedPt}</strong>\n<span class="calc-note">↳ ${currentPhase.info.replace(/\n/g, '<br>↳ ')}</span>\n\n`;
        terminalScreen.scrollTop = terminalScreen.scrollHeight;

        if (st > 0) { 
            connectVertices(historyNode, currentPhase.coord, 'rgba(192, 57, 43, 0.4)'); 
        }
        
        if (st === computationalSteps.length - 1) {
            plotCoordinate(currentPhase.coord, COL_FINAL_KEY, 10);
            terminalScreen.innerHTML += `<span style="color:${COL_FINAL_KEY}; font-weight:bold; font-size:1.1em;">=== GENERATED PUBLIC KEY (Q) ===\nQ = ${formattedPt}</span>\n`;
        } else if (st !== 0) {
            plotCoordinate(currentPhase.coord, COL_JUMP_PATH, 6);
        }

        historyNode = currentPhase.coord;
        
        let dynamicDelay = parseInt(document.getElementById('tempoSlider').value);
        await new Promise(resolve => setTimeout(resolve, dynamicDelay));
    }
}
