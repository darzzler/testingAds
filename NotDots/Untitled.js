
var gameScene = new Phaser.Scene('Dots'); //main scene

        
        var config = { //starting settings
            type: Phaser.AUTO,
            width: 1000,
            height: 1000,
            scene: gameScene,
            numColors: 6, //select up to 8 colors!
            rows: 8, //select up to 10 rows and columns!
            columns: 8,
            scale: {
                mode: Phaser.Scale.FIT,
            },
            physics: {
                default: 'arcade'
            },
        };

        var game = new Phaser.Game(config);
        var score = 0; //tracks score
        var currentTime = 60; //tracks time
        var isStopped = false; //tracks if game should end
        var graphics; //graphics for drawing line 
        var grid; //dot grid
        var currentDot; //currently selected dot and subsequently selected dots
        var selectedDots = [];
        var drawLine; //should game draw a line?
        var line; //first lines
        var lines = []; //subsequent lines
        var pointerX; //pointer position
        var pointerY;
        

        gameScene.create = function () {
            this.cameras.main.setBackgroundColor(16777215);
            graphics = this.add.graphics();
            this.load.image('bowser', './src/bowser.jpg');
            var s = this.add.image(100, 100, 'bowser');
            grid = new DotGrid(config.columns, config.rows); //create grid and add phsyics 
            grid.getAllDots().forEach(function (dot) {
                gameScene.physics.add.existing(dot);

            })
        }


        gameScene.update = function () {
            
            graphics.clear(); //clears canvas for line

            gameScene.onDotDown(); //checks input
            gameScene.onPointerUp();
            gameScene.onPointerMove();

            this.input.on('pointermove', function (pointer) { //tracks mouse
                pointerX = pointer.x;
                pointerY = pointer.y;
            })

            if (drawLine) {  //draws initial line
                line = new Phaser.Geom.Line(currentDot.x, currentDot.y, pointerX, pointerY);
                graphics.lineStyle(10, currentDot.color);
                graphics.strokeLineShape(line);
            }

            grid.getAllDots().forEach(function (dot) { //updates dot movement distance
                dot.update();
            })
        }
        

        gameScene.onDotDown = function () { //selects dots
            grid.getAllDots().forEach(function (dot) {
                dot.on('pointerdown', function (pointer) {
                    currentDot = dot;
                    drawLine = true;
                })
            })
        }
        
        gameScene.onPointerUp = function () { //marks selection for destruction, clears selection
            this.input.on('pointerup', function (pointer) {
                if (selectedDots.length > 0) { //push current dot into array
                    selectedDots.push(currentDot);
                }

                grid.destroyDots(selectedDots); //update score
                score += selectedDots.length;
                document.getElementById("score").innerHTML = "Score: " + score;

                drawLine = false; //reset dots and lines
                currentDot = null;
                line = null;
                lines = [];
                selectedDots = [];
                graphics.clear();
            })
        }

       
        gameScene.onPointerMove = function () {  //runs on pointer move, draws line from dots if a dot is selected
            if (drawLine) {
                for (let i = 0; i < grid.numColumns; i++) {
                    for (let j = 0; j < grid.numRows; j++) {
                        let dot = grid.dots[i][j];
                        if (dot.pointerOver == true && !selectedDots.includes(dot)) { //draws new line if dot is selected and adjacent
                            if (grid.dotIsAdjacent(currentDot, dot) && currentDot.color == dot.color) {
                                line = new Phaser.Geom.Line(currentDot.x, currentDot.y, dot.x, dot.y);  //set line between points, draw new line
                                lines.push(line);
                                selectedDots.push(currentDot);
                                currentDot = dot;
                            }
                        }
                    }
                    lines.forEach(function (line) { //draw each line
                        graphics.lineStyle(10, currentDot.color);
                        graphics.strokeLineShape(line);
                    })
                }
            }
        }


        gameScene.timer = setInterval(function () { //timer function, runs every second
            if (!isStopped) {
                currentTime--;
                document.getElementById("timer").innerHTML = currentTime;
                if (currentTime == 0) {
                    grid.getAllDots().forEach(function (dot) { //disable dot interaction
                        dot.disableInteractive();
                    })
                    
                    button = gameScene.add.rectangle(config.width / 2, -200, 500, 150, 16777215); //create reset button
                    gameScene.physics.add.existing(button);
                    var text = gameScene.add.text(375, -165, 'Restart?', { fontFamily: 'sans-serif', fontSize: 64, color: '0' });
                    button.setStrokeStyle(5, 16737891);

                    gameScene.tweens.add({ //bounce ui in
                        targets: button,
                        y: { value: 175, duration: 1000, ease: 'Bounce.easeOut' },
                    });
                    gameScene.tweens.add({
                        targets: text,
                        y: { value: 140, duration: 1000, ease: 'Bounce.easeOut' },
                    });

                    button.setInteractive(new Phaser.Geom.Rectangle(0, 0, 500, 225), Phaser.Geom.Rectangle.Contains); //set button interactions
                    button.on('pointerover', function () {
                        button.setFillStyle(16737891);
                    })
                    button.on('pointerout', function () {
                        button.setFillStyle(16777215);
                    })
                    button.on('pointerdown', function () {
                        location.reload();
                    })
                    isStopped = true;
                }
            }
        }, 1000);

        
        class Dot extends Phaser.GameObjects.Ellipse { //class for each individual dot, extension of phaser gameobject ellipse
            constructor(scene, xPos, yPos, color, column, row) {
                super(scene, xPos, yPos, 50, 50, color);
                this.color = color;
                this.size = 50;
                this.column = column;  //position within dot grid
                this.row = row; 
                this.setInteractive(new Phaser.Geom.Ellipse(this.size / 2, this.size / 2, 75, 75), Phaser.Geom.Ellipse.Contains);

                this.on('pointerover', function () {
                    this.pointerOver = true;
                    let circle = gameScene.add.ellipse(this.x, this.y, this.size, this.size, this.color); //effect on pointer over
                    gameScene.tweens.add({
                        targets: circle,
                        scaleX: 1.75,
                        scaleY: 1.75,
                        alpha: 0,
                        duration: 450,
                        ease: 'linear'
                    })
                })

                this.on('pointerout', function () {
                    this.pointerOver = false;
                })

                this.moving = false; //keeps track of destination and movement
                this.destination;

                this.queue = [];  //stores future moves

                scene.add.existing(this);
            }


            setColor(newColor) { //assigns new color
                this.color = newColor;
                this.setFillStyle(newColor);
            }


            update() { //checks distance between dot and destination, activates next move if dot is done moving
                if (this.moving) {
                    let distance = Phaser.Math.Distance.Between(this.x, this.y, this.destination.x, this.destination.y);
                    if (distance < 10) {
                        this.body.reset(this.destination.x, this.destination.y);
                        this.moving = false;
                        this.destination = null;
                        if (this.queue.length > 0) {
                            this.moveTo(this.queue.shift(), 500);
                        }
                    }
                }
            }


            moveTo(dest, duration) { //tweens dot to new location, if already in motion, adds next tween to quee
                if (this.moving == false) {
                    this.destination = dest;
                    gameScene.tweens.add({
                        targets: this,
                        x: { value: this.destination.x, duration: duration, ease: 'Bounce.easeOut' },
                        y: { value: this.destination.y, duration: duration, ease: 'Bounce.easeOut' },
                        onActive: this.moving = true,
                    });
                } else {
                    this.queue.push(dest);
                }
            }

           
            changePlace(x, y, column, row) {  //swaps two dots places, both position and in grid
                this.x = x;
                this.y = y;
                this.column = column;
                this.row = row;
            }
        }


        //class for grid that stores dots
        class DotGrid {
            constructor(numColumns, numRows) {
                this.numColumns = numColumns;
                this.numRows = numRows;
                this.hexSize = 50;
                this.xStart = 100 + ((10 - config.columns) * 50);
                this.yStart = 25;
                this.colors = [16354486, 7321558, 16772433, 10412190, 10848705, 16558469, 4765091, 16737891];

                this.hexWidth = Math.sqrt(3) * this.hexSize;
                this.hexHeight = this.hexSize * 2;

                //stores dots
                this.dots = [];
                //stores locations of each dot
                this.dotLocs = [];

                //build grid and grid locations
                this.x = this.xStart;
                this.y = this.yStart + this.hexHeight;
                for (let i = 0; i < numColumns; i++) {
                    this.dots[i] = [];
                    this.dotLocs[i] = [];
                    for (let j = 0; j < numRows; j++) {
                        //add dot, store location, move on
                        let color = this.colors[Math.floor(Math.random() * config.numColors)];
                        this.dots[i][j] = new Dot(gameScene, this.x, this.y, color, i, j);
                        this.dotLocs[i][j] = new Phaser.Geom.Point(this.x, this.y);
                        if (j % 2 == 0) {
                            this.x += this.hexWidth / 2;
                        }
                        else {
                            this.x -= this.hexWidth / 2;
                        }
                        this.y += this.hexHeight * (3 / 4);
                    }
                    this.x = this.xStart + this.hexWidth * (i + 1);
                    this.y = this.hexHeight + this.yStart;
                }
            }

           
            getAllDots() {  //returns an array of every dot 
                let allDots = [];
                for (let i = 0; i < this.numColumns; i++) {
                    for (let j = 0; j < this.numRows; j++) {
                        allDots.push(this.dots[i][j]);
                    }
                }
                return allDots;
            }

            
            dotIsAdjacent(dotA, dotB) { //checks if two dots are next to eachother
                if (dotA == dotB) {
                    return false;
                } else {
                    let distance = Phaser.Math.Distance.Between(dotA.x, dotA.y, dotB.x, dotB.y);
                    if (distance > this.hexWidth + 1) {
                        return false;
                    }
                }
                return true;
            }

           
            destroyDots(selectedDots) {  //destroys selected dots, marks columns that need sorting
                let columnsSeen = []
                selectedDots.forEach(function (dot) {
                    dot.setColor(16777215);
                    if (!columnsSeen.includes(dot.column)) {
                        columnsSeen.push(dot.column);
                    }
                })
                
                for (let i = 0; i < columnsSeen.length; i++) { //sort seen columns
                    this.columnSort(this.dots[columnsSeen[i]], columnsSeen[i]);
                }
            }

            
            columnSort(column, index) { //sorts column and adds new dots
                for (let i = 0; i < column.length; i++) { //bubble sorts column and brings destroyed dots to top
                    for (let j = 1; j < column.length; j++) {
                        if (column[j].color == 16777215 && column[j - 1].color != 16777215) {

                            let tempX = column[j].x;
                            let tempY = column[j].y;
                            let tempRow = column[j].row;
                            let temp = column[j];

                            column[j].changePlace(column[j - 1].x, column[j - 1].y, column[j - 1].column, column[j - 1].row);
                            column[j] = column[j - 1];

                            column[j - 1].moveTo(this.dotLocs[index][j], 500);
                            column[j - 1].row = tempRow;
                            column[j - 1] = temp;
                        }
                    }
                }

                let counter = 0; //counts number of dots that need to be added
                column.forEach(function (dot) {
                    if (dot.color == 16777215) {
                        counter += 1;
                    }
                })
                
                for (let i = 0; i < column.length; i++) { //for each dot that needs to be added, place it above grid and send it down
                    if (column[i].color == 16777215) {
                        let newColor = this.colors[Math.floor(Math.random() * config.numColors)];
                        column[i].setColor(newColor);
                        column[i].x = this.dotLocs[index][0].x;
                        column[i].y = this.dotLocs[index][0].y - ((counter * 100) - (i * 100));
                        column[i].moveTo(this.dotLocs[index][0], 400);
                        for (let j = 1; j < i + 1; j++) {
                            column[i].moveTo(this.dotLocs[index][j], 600);
                        }
                    }
                }
            }
        }