'use strict';
console.log('Hello World');
const FLAG = "🚩";
const MINE = "💣";
var gBoard = [];//the model

// oncontextmenu="cellMarked(this)
var gLevel = {
    size: 4,
    mines: 2
}
var gGame = {
    isOn: false,
    shownCount: 0,
    markedCount: 0,
    secsPassed: 0
}
function init() {//פונקציה שמאתחלת את המשחק
    console.log('init game');
}

gBoard = buildBoard(gLevel.size)
renderBoard(gBoard)


function buildBoard(size) {
    console.log('build board');

    for (var i = 0; i < size; i++) {
        gBoard[i] = [];
        for (var j = 0; j < size; j++) {
            var cell = {
                minesAroundCount: 0,
                isShown: true,
                isMine: false,
                isMarked: false,
                
            }
            gBoard[i][j] = cell;
        }
    }
    setMinesNegsCount(gBoard);
    gBoard[1][1].isMine = true;
    gBoard[2][2].isMine = true;

    console.table(gBoard)
    return gBoard;
}



function renderBoard(board) {//Render the board as a <table> to the page.

    var strHTML = '';
    for (var i = 0; i < board.length; i++) {
        strHTML += '<tr>\n';
        for (var j = 0; j < board[0].length; j++) {
            var currCell = board[i][j];
            var cell; //התא שירונדר
            var tdId = 'cell-' + i + '-' + j;
            if (currCell.isMine) {
                cell = "💣";
                ;
            }
            else if (currCell.isShown && currCell.minesAroundCount >= 0) {
                cell = currCell.minesAroundCount;
            } else cell = ' '

            
            strHTML += '\t<td id="' + tdId + '" class="cell" onclick="cellClicked(this)">' + cell + '</td>\n';
        }
        strHTML += '</tr>\n'
    }
    var elBoard = document.querySelector('.board');
    console.log(elBoard);
    elBoard.innerHTML = strHTML;

}

function setMinesNegsCount(board) {

    for (var i = 0; i < board.length; i++) {
        for (var j = 0; j < board[0].length; j++) {
            var currCell = board[i][j];
            currCell.minesAroundCount = countNegsAroundCell(i, j)
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


// location such as: {i: 2, j: 7}
function renderCell(pos) {// הפונקציה שמעבירה את המידע לדום זאת אומרת מרנדרת אותה
    // Select the elCell and set the value
    var elCell = document.querySelector("'cell-' + i + '-' + j");
    elCell.innertext = MINE;
}
function getRandomIntInclusive(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function checkGameOver() {// check if game is over.
    console.log('check if game over');
}
