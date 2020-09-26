'use strict';
console.log('Hello World');
const FLAG = "🚩";
const MINE = "💣";
const NONEGS = "0";
const EMPTY = " ";
var gBoard;
var isFirstClick = true;
var gTimerInterval = null;


var gGame = {
    isOn: false,
    shownCount: 0,
    markedCount: 0,
    secsPassed: 0
}
var gSelectedLevel = 'Beginner'
var gLevel = {
    size: 4,
    mines: 2,
    live: 1
}
function init() {
    resetGame()
    clearInterval(gTimerInterval)
    gBoard = buildBoard();
    isFirstClick = true;
    createMines(gLevel, gBoard);
    setMinesNegsCount(gBoard);
    renderBoard(gBoard);
    var elButton = document.querySelector('.reset button');
    elButton.innerHTML = "😀";
    gGame.isOn = true;
    gGame.shownCount = 0;
}


function setLevel(elLevelButton) {
    if (elLevelButton.innerText === 'Beginner') {
        gSelectedLevel = 'Beginner';
        gLevel = {
            size: 4,
            mines: 2,
            live: 1,
        };
        init();
        var StrLive1 = '❤️';
        var elLive = document.querySelector('.live span')
        elLive.innerText = StrLive1;
        var StrMines1 = '2';
        var elMines = document.querySelector('.mines span')
        elMines.innerText = StrMines1;

    } else if (elLevelButton.innerText === 'Pro') {
        gSelectedLevel = 'Pro';
        gLevel = {
            size: 8,
            mines: 12,
            live: 2
        }
        var StrLive2 = '❤️❤️'
        var elLive = document.querySelector('.live span')
        elLive.innerText = StrLive2
        var StrMines2 = '12'
        var elMines = document.querySelector('.mines span')
        elMines.innerText = StrMines2
        init();
    } else if (elLevelButton.innerText === 'World Class') {
        gSelectedLevel = 'World Class';
        gLevel = {
            size: 12,
            mines: 30,
            live: 3
        }
        var StrLive3 = '❤️❤️❤️'
        var elLive = document.querySelector('.live span')
        elLive.innerText = StrLive3
        var StrMines3 = '30';
        var elMines = document.querySelector('.mines span')
        elMines.innerText = StrMines3;
        init();
    }
}

function buildBoard() {
    console.log('build board');
    var board = []
    for (var i = 0; i < gLevel.size; i++) {
        board[i] = [];
        for (var j = 0; j < gLevel.size; j++) {
            var cell = {
                minesAroundCount: 0,
                isShown: false,
                isMine: false,
                isMarked: false,
                isFlagged: false
            }
            board[i][j] = cell;
        }
    }
    
    return board;
}

function renderBoard(board) {
    var strHTML = '';
    for (var i = 0; i < board.length; i++) {
        strHTML += '<tr>\n';
        for (var j = 0; j < board[0].length; j++) {
            var currCell = board[i][j];
            var cell;
            var tdId = 'cell-' + i + '-' + j;
            if (currCell.isMine && currCell.isShown) cell = MINE;
            else if (currCell.isShown && currCell.minesAroundCount > 0) cell = currCell.minesAroundCount;
            else if (currCell.isShown && currCell.minesAroundCount === 0) {
                cell = NONEGS;
            }
            else cell = EMPTY
            strHTML += `\t<td class="cell" id="${tdId}" oncontextmenu="cellMarked(${i},${j})"  onclick="cellClicked(this,${i},${j})" >${cell}</td>\n`;
        }
        strHTML += '</tr>\n'
    }
    var elBoard = document.querySelector('.board');
    console.log(elBoard);
    elBoard.innerHTML = strHTML;
}

function renderCell(value, i, j) {
    var elCell = document.querySelector(`#cell-${i}-${j}`);
    elCell.innerHTML = value;


}




function cellMarked(i, j) {
    if (!gGame.isOn) return;
    var currCell = gBoard[i][j];
    if (currCell.isShown && currCell.minesAroundCount !== EMPTY) return;
    if (!currCell.isFlagged) {
        currCell.isFlagged = true;
        renderCell(FLAG, i, j);
            gGame.markedCount++
    } else {
        currCell.isFlagged = false;
        renderCell(EMPTY, i, j);
            gGame.markedCount--

    }
    
   var elMarkedCount = document.querySelector('.flagged span');
    elMarkedCount.innerText = gGame.markedCount;
    checkGameWin();
}

function cellClicked(cell, i, j) {
    var StrLive1 = '❤️';
    var StrLive2 = '❤️❤️';
    var elLive = document.querySelector('.live span');

    if (!gGame.isOn) return;
    var currCell = gBoard[i][j];
    if (currCell.isFlagged) return;
    if (currCell.isShown) return;
    if (gGame.shownCount === 0 && gGame.isOn) {
        startTimer()
        if (currCell.isMine) {
            firstClickNeverAMine(gBoard, i, j);

        }
    }
    currCell.isShown = true
    if (currCell.isMine) {
        renderCell(MINE, i, j);
        gLevel.live--;
        if (gLevel.live === 2) {
            elLive.innerText = StrLive2;
        } else if (gLevel.live === 1) {
            elLive.innerText = StrLive1;
        } else if (gLevel.live === 0) {
            elLive.innerText = 'You out of lives';
            elLive.style.color ='red';
            allMinesShow()
            gameOver();

        }
    }

    if (currCell.minesAroundCount > 0 && !currCell.isMine) {
        cell = currCell.minesAroundCount;
        gGame.shownCount++;
        renderCell(cell, i, j);
    }
    else if (currCell.minesAroundCount === 0 && !currCell.isMine) {
        cell = NONEGS;
        showNeighbors(i, j)
        gGame.shownCount++;
        renderCell(cell, i, j);
    }

    checkGameWin();
}




function allMinesShow() {
    for (var i = 0; i < gBoard.length; i++) {
        for (var j = 0; j < gBoard[0].length; j++) {
            var currCell = gBoard[i][j];
            if (currCell.isMine) {
                renderCell(MINE, i, j);
            }
        }
    }
}

function setMinesNegsCount(board) {  
    for (var i = 0; i < board.length; i++) {
        for (var j = 0; j < board[0].length; j++) {
            var currCell = board[i][j];
            currCell.minesAroundCount = countNegsAroundCell(i, j);
        }
    }
    return currCell.minesAroundCount;
}



function countNegsAroundCell(rowIdx, collJdx) {
    var count = 0
    for (var i = rowIdx - 1; i <= rowIdx + 1; i++) {
        if (i < 0 || i >= gBoard.length) continue;
        for (var j = collJdx - 1; j <= collJdx + 1; j++) {
            if (j < 0 || j >= gBoard[i].length) continue;
            if (i === rowIdx && j === collJdx) continue;
            var cell = gBoard[i][j].isMine
            if (cell) count++
        }
    }
    return count;
}

function getRandomIntInclusive(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}




function checkGameWin() {
    if (gGame.shownCount === (Math.pow(gLevel.size, 2) - gLevel.mines) && gGame.markedCount === gLevel.mines) {
        victory();
        clearInterval(gTimerInterval);
    }
}
function victory() {

    var elButton = document.querySelector('.reset button');
    elButton.innerHTML = "🤑YOU WON🤑"
    gGame.isOn = false;
}


function gameOver() {
    clearInterval(gTimerInterval);
    gGame.isOn = false;
    var elButton = document.querySelector('.reset button')
    elButton.innerHTML = "😥Restart😥"
}

function showNeighbors(rowIdx, collJdx) {
    for (var i = rowIdx - 1; i <= rowIdx + 1; i++) {
        if (i < 0 || i >= gBoard.length) continue;
        for (var j = collJdx - 1; j <= collJdx + 1; j++) {
            if (j < 0 || j >= gBoard[i].length) continue;
            if (i === rowIdx && j === collJdx) continue;
            var currCell = gBoard[i][j];
            if (currCell.isShown) continue
            currCell.isShown = true;
            if (currCell.minesAroundCount === 0) {
                currCell.minesAroundCount = NONEGS;
            }
            currCell = currCell.minesAroundCount;
            renderCell(currCell, i, j);
            gGame.shownCount++;
        }
    }
}

function firstClickNeverAMine(board, row, col) {
    var currCell = board[row][col];
    var newMineCords = randomizeMines(board);
    var newCord = newMineCords[getRandomIntInclusive(0, newMineCords.length)]
    var posI = newCord.i;
    var posJ = newCord.j;
    currCell.isMine = false;
    board[posI][posJ].isMine = true;
    setMinesNegsCount(board);
    renderBoard(board)
}
function randomizeMines(board) {
    var emptyCells = [];
    for (var i = 0; i < board.length; i++) {
        for (var j = 0; j < board.length; j++) {
            var pos = { i: i, j: j };
            var currCell = board[i][j];
            if (!currCell.isMine) {
                emptyCells.push(pos);
            }
        }
    }
    return emptyCells;
}

function createMines(gLevel, board) {
    var emptyLocationForMines = randomizeMines(board).slice();
    for (var i = 0; i < gLevel.mines; i++) {
        var pos = getRandomIntInclusive(0, (emptyLocationForMines.length - 1));
        var mineLocation = emptyLocationForMines[pos];
        board[mineLocation.i][mineLocation.j].isMine = true
        emptyLocationForMines.splice(pos, 1);
    }
}
function startTimer() {
    var startTimer = new Date();

    gTimerInterval = setInterval(function () {
        var endTime = new Date();
        var timerDiff = ((endTime - startTimer) / 1000);
        var secs = Math.round(timerDiff % 60);
        timerDiff = Math.floor(timerDiff / 60);
        var mins = Math.round(timerDiff % 60);
        var elTimer = document.querySelector('.timer');
        elTimer.innerText = mins + ':' + secs;
    }, 1000)
}
function resetGame() {
        if (gSelectedLevel === 'Beginner') {
            gLevel = {
                size: 4,
                mines: 2,
                live: 1,
            };
            
            var StrLive1 = '❤️';
            var elLive = document.querySelector('.live span')
            elLive.innerText = StrLive1;
        } else if (gSelectedLevel === 'Pro') {
            gLevel = {
                size: 8,
                mines: 12,
                live: 2
            }
            var StrLive2 = '❤️❤️'
            var elLive = document.querySelector('.live span')
            elLive.innerText = StrLive2
           
        } else if (gSelectedLevel === 'World Class') {
            gLevel = {
                size: 12,
                mines: 30,
                live: 3
            }
            var StrLive3 = '❤️❤️❤️'
            var elLive = document.querySelector('.live span')
            elLive.innerText = StrLive3
           
        }
   
}