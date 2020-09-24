'use strict';
console.log('Hello World');
const FLAG = "🚩";
const MINE = "💣";
const NONEGS = "⭐️";
const EMPTY = " ";
var gBoard;//the model
var isFirstClick = true;
var gTimerInterval = startTimer();


var gLevel = {// the levels
    size: 4,
    mines: 2

}
var gGame = {//the game
    isOn: false,
    shownCount: 0,
    markedCount: 0,
    secsPassed: 0,
    lives: 3
}
function init() {//פונקציה שמאתחלת את המשחק
    gBoard = buildBoard();
    isFirstClick = false;
    createMines(gLevel, gBoard);
    setMinesNegsCount(gBoard);
    renderBoard(gBoard);
    var elButton = document.querySelector('.btn button');
    elButton.innerHTML = "😀";
    gGame.isOn = true;
    gGame.shownCount = 0;
    startTimer()

    clearInterval(gTimerInterval)
}
function buildBoard() {// build the board
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


    console.table(board)
    console.log(board);
    return board;
}
function renderBoard(board) {//Render the board as a <table> to the page.

    var strHTML = '';
    for (var i = 0; i < board.length; i++) {
        strHTML += '<tr>\n';
        for (var j = 0; j < board[0].length; j++) {
            var currCell = board[i][j];
            var cell; //התא שירונדר
            var tdId = 'cell-' + i + '-' + j;
            if (currCell.isMine && currCell.isShown) cell = MINE;
            else if (currCell.isShown && currCell.minesAroundCount > 0) cell = currCell.minesAroundCount;
            else if (currCell.isShown && currCell.minesAroundCount === 0) {
                cell = NONEGS;


            }
            else cell = EMPTY

            strHTML += `\t<td class="cell" id="${tdId}" oncontextmenu="cellMarked(this,${i},${j})"  onclick="cellClicked(this,${i},${j})" >${cell}</td>\n`;
        }
        strHTML += '</tr>\n'
    }

    var elBoard = document.querySelector('.board');
    console.log(elBoard);
    elBoard.innerHTML = strHTML;

}
function cellMarked(cell, i, j) {

    if (!gGame.isOn) return;
    var currCell = gBoard[i][j];
    if (currCell.isShown && currCell.minesAroundCount !== EMPTY) return;
    if (currCell.isFlagged) {
        currCell.isFlagged = false;
        cell = EMPTY;
        elCell = document.querySelector(`#cell-${i}-${j}`).innerHTML = cell;
    }
    currCell.isFlagged = true;
    if (currCell.isMine) {
        cell = FLAG;
        gGame.markedCount++
        renderCell(cell, i, j);
        console.log('flagged');
    } else if (!currCell.isMine) {
        cell = FLAG;
        renderCell(cell, i, j);
        console.log(' wrong flagged');
    }
    checkGameOver();
}
function cellClicked(cell, i, j) {
    //when pointer clicked on the board
    if (!gGame.isOn) return;
    var currCell = gBoard[i][j];
    // if (!isFirstClick) {
    //     createMines(gLevel, gBoard);
    //     isFirstClick = true;
    // }
    if (currCell.isShown) return;

    currCell.isShown = true

    if (currCell.minesAroundCount > 0 && !currCell.isMine) {
        cell = currCell.minesAroundCount;
        gGame.shownCount++;
        renderCell(cell, i, j);
    }
    else if (currCell.isMine) {
        for (var i = 0; i < gBoard.length; i++) {
            for (var j = 0; j < gBoard[0].length; j++) {
                cell = gBoard[i][j];
                if (currCell.isMine) {
                    cell = MINE;
                    renderCell(cell, i, j);
                }

            }
        }

        gameOver();
    }
    else if (currCell.minesAroundCount === 0) {
        cell = NONEGS;
        showNeighbors(i, j)

        gGame.shownCount++;
        renderCell(cell, i, j);
    }
    checkGameOver();
}
function renderCell(value, i, j) {// הפונקציה שמעבירה את המידע לדום זאת אומרת מרנדרת אותה
    var elCell = document.querySelector(`#cell-${i}-${j}`);
    elCell.innerHTML = value;
}
function renderCelltext(value, i, j) {// הפונקציה שמעבירה את המידע לדום זאת אומרת מרנדרת אותה
    var elCell = document.querySelector(`#cell-${i}-${j}`);
    elCell.innerText = value;
}
function randomizeMines(board) {// find a place for mines

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
function createMines(gLevel, board) {//crate mines in the board
    var emptyLocationForMines = randomizeMines(board).slice();
    for (var i = 0; i < gLevel.mines; i++) {
        var pos = getRandomIntInclusive(0, (emptyLocationForMines.length - 1));
        var mineLocation = emptyLocationForMines[pos];
        board[mineLocation.i][mineLocation.j].isMine = true
        emptyLocationForMines.splice(pos, 1);
    }
}
function setMinesNegsCount(board) { // setting numbers for mines neighbors 
    for (var i = 0; i < board.length; i++) {
        for (var j = 0; j < board[0].length; j++) {
            var currCell = board[i][j];
            currCell.minesAroundCount = countNegsAroundCell(i, j);

        }
    }
    return currCell.minesAroundCount;
}
function countNegsAroundCell(rowIdx, collJdx) {//counting neigbors around the mines

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
function getRandomIntInclusive(min, max) {//get random intinclusive
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function checkGameOver() {
    if (gGame.shownCount === (Math.pow(gLevel.size, 2) - gLevel.mines) && gGame.markedCount === gLevel.mines) {
        victory();
    }


}
function gameOver() {
    clearInterval(gTimerInterval);
    gGame.isOn = false;
    var elButton = document.querySelector('.btn button')
    elButton.innerHTML = "😥"

}
function victory() {
    var strHTML = 'VICTORIOUS!!!!';
    var elVictory = document.querySelector('.title h1 span');
    // elVictory.innerText = strHTML;
    var elButton = document.querySelector('.btn button');
    elButton.innerHTML = "🤑"
    gGame.isOn = false;
}
function setLevel(elLevelButton) {
    if (elLevelButton.innerText === 'Beginner') {
        gLevel = {
            size: 4,
            mines: 2,
            live: 1
        };
        init();
    } else if (elLevelButton.innerText === 'Pro') {
        gLevel = {
            size: 8,
            mines: 12,
            live: 3
        }
        init();
    } else if (elLevelButton.innerText === 'World Class') {
        gLevel = {
            size: 12,
            mines: 30,
            live: 3
        }
        init();
    }
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


