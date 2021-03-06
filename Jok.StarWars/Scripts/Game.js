﻿var Game = {
    stage: undefined,
    gameLayer: undefined,
    planets: [],
    Game: this,
    currentPlayerGroupID: undefined,
    colors: ['gray', 'green', 'yellow'],
    selectedPlanet: undefined,
    proxy: undefined,
    canvasIsDrawn: undefined,
    gameIsOver: undefined,
    conqueringShips: 50,
    percentageLabel: undefined,
    selectedPlanetIDs: [],
    Init: function () {
        Game.proxy = new GameHub('GameHub', jok.config.sid, jok.config.channel);
        Game.proxy.on('Online', this.Online.bind(this));
        Game.proxy.on('Offline', this.Offline.bind(this));
        Game.proxy.on('PlayerMove', this.PlayerMove.bind(this));
        Game.proxy.on('TableState', this.TableState.bind(this));
        Game.proxy.on('UpdatePlanetsState', this.UpdatePlanetsState.bind(this));
        Game.proxy.on('UserAuthenticated', this.UserAuthenticated.bind(this));
        Game.proxy.on('Close', this.Close.bind(this));
        //Game.proxy.on('PlayAgain', this.PlayAgain(this));
        Game.proxy.start();
        Game.LoadPlayerSettings();
    },


    // Server Callbacks ----------------------------------------
    Online: function () {
        console.log('server is online');
    },

    Offline: function () {
        console.log('server is offline');
    },

    PlayerMove: function (userid, fromObject, toObject, shipsCount, animationDuration) {
        var startPlanet = undefined;
        var targetPlanet = undefined;
        Game.planets.forEach(function (planet) {
            if (planet.ID == fromObject) {
                startPlanet = planet;
            }
            if (planet.ID == toObject) {
                targetPlanet = planet;
            }
        });
        var startX = startPlanet.getX();
        var startY = startPlanet.getY();
        var bomb = new Kinetic.Circle({
            x: startX,
            y: startY,
            radius: 3,
            fill: Game.colors[startPlanet.GroupID]
        });
        Game.gameLayer.add(bomb);
        Game.gameLayer.draw();
        var tween = new Kinetic.Tween({
            node: bomb,
            scaleX: 2,
            scaleY: 1.5,
            duration: 1,
            x: targetPlanet.getX(),
            y: targetPlanet.getY(),
            onFinish: function () {
                bomb.remove();
                bomb.destroy();
                Game.gameLayer.draw();
            }
        });
        
        console.log(tween);
        tween.play();

    },

    TableState: function (table) {
        table.players.forEach(function (player) {
            //console.log(player.GroupID);
            if (player.UserID == jok.currentUserID) {
                Game.currentPlayerGroupID = player.GroupID;
            }
        });
        switch (table.Status) {
            case 0:
                console.log('joined');
                $('#Notification > .item').hide();
                $('#Notification > .item.waiting_opponent').show();
                jok.setPlayer(1, jok.currentUserID);
                $('#StarWarsImage').removeClass('minimized');
                $('#container').hide();
                break;
            case 1:
                var opponent = (table.players[0].UserID == jok.currentUserID) ? table.players[1].UserID : table.players[0].UserID;
                jok.setPlayer(1, jok.currentUserID);
                jok.setPlayer(2, opponent);
                $('#Notification > .item').hide();
                this.DrawPlanets(table.Planets);
                $('#StarWarsImage').addClass('minimized');
                $('#container').show();
                break;
            case 3:
                Game.gameIsOver = true;
                $('#Notification > .item').hide();
                $('#Notification > .item.table_finish_winner > span').html(jok.players[table.LastWinner].nick);
                $('#Notification > .item.table_finish_winner').show();
                $('#StarWarsImage').removeClass('minimized');
                $("#container").html("");
                $('#container').hide();
                
                Game.canvasIsDrawn = undefined;

                break;
        }
    },

    UserAuthenticated: function (userid) {
        jok.currentUserID = userid;
    },

    DrawPlanets: function (remotePlanets) {
        if (Game.canvasIsDrawn != undefined) {
            return;
        }
        Game.canvasIsDrawn = true;
        this.stage = new Kinetic.Stage({
            container: 'container',
            width: 800,
            height: 600,
        });
        this.gameLayer = new Kinetic.Layer();
        this.gameLayer.clear();
        remotePlanets.forEach(function (planet) {
            var circle = new Kinetic.Circle({
                x: planet.X,
                y: planet.Y,
                radius: planet.Radius,
                fill: Game.colors[planet.GroupID],
            });
            circle.Text = new Kinetic.Text({
                //text: planet.ShipCount.toString(),
                fontSize: 14,
                fontFamily: 'Calibri',
                fill: 'black'
            });
            circle.Text.setX(circle.getX() - circle.Text.getWidth() / 2);
            circle.Text.setY(circle.getY() - circle.Text.getHeight() / 2);
            circle.Text;
            circle.ShipCount = planet.ShipCount;
            circle.GroupID = planet.GroupID;
            circle.ID = planet.ID;
            circle.RemoveSelection = function () {
                this.setStroke(null);
                Game.selectedPlanet = undefined;
                Game.gameLayer.draw();
            }
            circle.OnMouseOver = function () {
                circle.setOpacity(0.7);
                Game.gameLayer.draw();
            }
            circle.OnMouseOut = function () {
                circle.setOpacity(1);
                Game.gameLayer.draw();
            }
            circle.OnClick = function (e) {
                if (Game.gameIsOver != undefined && Game.gameIsOver) {
                    return;
                }
                if (e.which == 1) {
                    if (Game.selectedPlanetIDs.indexOf(this.ID) != -1) {
                        while (Game.selectedPlanetIDs.indexOf(this.ID) > -1) {
                            this.RemoveSelection();
                            Game.selectedPlanetIDs.splice(Game.selectedPlanetIDs.indexOf(this.ID), 1);
                        }
                        return;
                    }

                    if (this.GroupID != Game.currentPlayerGroupID) {
                        Game.proxy.send('move', Game.selectedPlanetIDs, this.ID, Game.conqueringShips);
                        Game.planets.forEach(function (planet) {
                            planet.setStroke(null);
                        });
                        Game.selectedPlanetIDs = [];
                        return;
                    }

                    Game.selectedPlanetIDs.push(this.ID);
                    this.setStroke('red');
                    Game.gameLayer.draw();
                }
                else if (e.which == 3) {
                    Game.proxy.send('move', Game.selectedPlanetIDs, this.ID, Game.conqueringShips);
                    Game.planets.forEach(function (planet) {
                        planet.setStroke(null);
                    });
                    Game.selectedPlanetIDs = [];
                }
            };

            circle.on('mouseover', function () {
                circle.OnMouseOver();
            });
            circle.Text.on('mouseover', function () {
                circle.OnMouseOver();
            });
            circle.on('mouseout', function () {
                circle.OnMouseOut();
            });
            circle.on('click tap', function (e) {
                circle.OnClick(e);
            });
            circle.Text.on('click tap', function (e) {
                circle.OnClick(e);
            });
            Game.planets.push(circle);

            Game.gameLayer.add(circle);
            Game.gameLayer.add(circle.Text);
        });
        $(document).on('mousewheel', function (event) {
            if (Game.gameIsOver != undefined) {
                return;
            }
            if (event.originalEvent.wheelDelta < 0) {
                Game.DecreasePercentage();
                event.preventDefault();
            } else {
                Game.IncreasePercentage();
                event.preventDefault();
            }
        });
        $(document).on('DOMMouseScroll', function (event) {
            if (Game.gameIsOver != undefined) {
                return;
            }
            if (event.originalEvent.detail > 0) {
                Game.DecreasePercentage();
                event.preventDefault();
            } else {
                Game.IncreasePercentage();
                event.preventDefault();
            }

        });
        Game.UpdatePercentage();
        window.scrollTo(0, document.body.scrollHeight);
        Game.stage.add(Game.gameLayer);
        Game.stage.draw();
        $(".play_again").on('click', this.OnPlayAgain);
    },
    SetPercentage: function (percent) {
        localStorage.ShipPercentage = percent;
    },
    IncreasePercentage: function () {
        Game.conqueringShips = Math.min(100, Game.conqueringShips + 5);
        Game.UpdatePercentage();
    },
    DecreasePercentage: function () {
        Game.conqueringShips = Math.max(10, Game.conqueringShips - 5);
        Game.UpdatePercentage();
    },
    UpdatePercentage: function () {
        $("#percentage").html(Game.conqueringShips.toString() + "%");
        Game.SetPercentage(Game.conqueringShips);
    },
    LoadPlayerSettings : function(){
        if (localStorage.ShipPercentage) {
            Game.conqueringShips = localStorage.ShipPercentage;
        } else {
            localStorage.ShipPercentage = 50;
        }
    },
    UpdatePlanetsState: function (remotePlanets) {
        //console.log(remotePlanets);
        Game.planets.forEach(function (planet) {
            for (var i = 0; i < remotePlanets.length; i++) {
                if (remotePlanets[i].ID == planet.ID) {
                    planet.ShipCount = remotePlanets[i].ShipCount;
                    planet.GroupID = remotePlanets[i].GroupID;
                    if (planet.ShipCount != -1)
                    {
                        planet.Text.setText(planet.ShipCount.toString());
                    }
                    else
                    {
                        planet.Text.setText("");
                    }
                    
                    planet.Text.setX(planet.getX() - planet.Text.getWidth() / 2);
                    planet.Text.setY(planet.getY() - planet.Text.getHeight() / 2);
                    planet.setFill(Game.colors[planet.GroupID]);
                }
            }
            Game.gameLayer.draw();
        });
    },

    Close: function (reason) {
        $('#Notification > .item').hide();
        $('#Notification > .item.quit > span').html(reason);
        $('#Notification > .item.quit').show();
        $('#Game').hide();
        jok.setPlayer(1, null);
        jok.setPlayer(2, null);
    },

    OnPlayAgain: function () {
        //$("#Game").html('<div id="StarWarsImage"></div><div id="container" oncontextmenu="return false;"></div>');
        Game.proxy.send('PlayAgain');
    }
}
Game.Init();
