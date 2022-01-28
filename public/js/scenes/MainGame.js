import { LEFT } from "phaser";

const GROUND_KEY = "ground";
const SKY_KEY = "sky";
const STAR_KEY = "star";
const BOMB_KEY = "bomb";
const DUDE_KEY = "dude";

// anims
const LEFT_ANIM = "left";
const TURN_ANIM = "turn";
const RIGHT_ANIM = "right";

const KEY_UP = "W";
const KEY_LEFT = "A";
const KEY_DOWN = "S";
const KEY_RIGHT = "D";

export default class MainGame extends Phaser.Scene {

    constructor()
    {
        super("MainGame");
    }

    preload() 
    {
        this.load.image(SKY_KEY, "assets/sky.png");
		this.load.image(GROUND_KEY, "assets/platform.png");
		this.load.image(STAR_KEY, "assets/star.png");
		this.load.image(BOMB_KEY, "assets/bomb.png");

        this.load.spritesheet(DUDE_KEY, "assets/dude.png", { frameWidth: 32, frameHeight: 48 });
    }
    create() 
    {
        this.add.image(400, 300, "sky");

        this.platforms = this.createPlatforms();

        const self = this;
        this.socket = io();
        this.otherPlayers = this.physics.add.group();

        this.socket.on('currentPlayers', function (players) 
        {
            Object.keys(players).forEach(function (id) 
            {
                if (players[id].playerId === self.socket.id) 
                {
                    self.addPlayer(self, players[id]);
                } 
                else 
                {
                    self.addOtherPlayers(self, players[id]);
                }
            });
        });
        this.socket.on('newPlayer', function (playerInfo) 
        {
            self.addOtherPlayers(self, playerInfo);
        });

        this.socket.on('disconnect', function (playerId) 
        {
            self.otherPlayers.getChildren().forEach(function (otherPlayer) 
            {
                if (playerId === otherPlayer.playerId) 
                {
                    otherPlayer.destroy();
                }
            });
        });

        this.socket.on('playerMoved', function (playerInfo) 
        {
            self.otherPlayers.getChildren().forEach(function (otherPlayer) 
            {
                if (playerInfo.playerId === otherPlayer.playerId) 
                {
                    otherPlayer.setPosition(playerInfo.x, playerInfo.y);
                    otherPlayer.anims.play(playerInfo.anim);
                }
            });
        });

        this.cursors = this.input.keyboard.addKeys({
			up: KEY_UP,
			down: KEY_DOWN,
			left: KEY_LEFT,
			right: KEY_RIGHT
		});       
    }

    update() 
    {
        if (this.ship) 
        {
            if (this.cursors.left.isDown) 
            {
                this.ship.setVelocityX(-160);
                this.ship.anims.play(LEFT_ANIM, true);
                this.ship.anim = LEFT_ANIM;
            } 
            else if (this.cursors.right.isDown) 
            {
                this.ship.setVelocityX(160);
                this.ship.anims.play(RIGHT_ANIM, true);
                this.ship.anim = RIGHT_ANIM;
            } 
            else 
            {
                this.ship.setVelocityX(0);
                this.ship.anims.play(TURN_ANIM);
                this.ship.anim = TURN_ANIM;
            }
        
            if (this.cursors.up.isDown && this.ship.body.touching.down) 
            {
                this.ship.setVelocityY(-250);
            } 
        
            // emit player movement
            var x = this.ship.x;
            var y = this.ship.y;
            if (this.ship.oldPosition && (x !== this.ship.oldPosition.x || y !== this.ship.oldPosition.y)) 
            {
                this.socket.emit('playerMovement', { x: this.ship.x, y: this.ship.y, anim: this.ship.anim });
            }
            // save old position data
            this.ship.oldPosition = {
                x: this.ship.x,
                y: this.ship.y,
                anim: this.ship.anim,
            };
        }
    }
    
    createPlatforms()
	{
		const platforms = this.physics.add.staticGroup();

		platforms.create(400, 568, GROUND_KEY).setScale(2).refreshBody();

		platforms.create(600, 400, GROUND_KEY);
		platforms.create(50, 250, GROUND_KEY);
		platforms.create(750, 220, GROUND_KEY);

		return platforms;
	}

    addPlayer(self, playerInfo) 
    {
        self.ship = self.physics.add.sprite(playerInfo.x, playerInfo.y, DUDE_KEY).setOrigin(0.5, 0.5);

        self.ship.setCollideWorldBounds(true);
        self.ship.setBounce(0);

        this.physics.add.collider(self.ship, this.platforms);
        //this.physics.add.collider(self.ship, this.otherPlayers);

        this.anims.create({
			key: LEFT_ANIM,
			frames: this.anims.generateFrameNumbers(DUDE_KEY, { start: 0, end: 3 }),
			frameRate: 10,
			repeate: -1
		})
		this.anims.create({
			key: TURN_ANIM,
			frames: [ { key: DUDE_KEY, frame: 4 }],
			frameRate: 20,
		})
		this.anims.create({
			key: RIGHT_ANIM,
			frames: this.anims.generateFrameNumbers(DUDE_KEY, { start: 5, end: 8 }),
			frameRate: 10,
			repeate: -1
		})
    }

    addOtherPlayers(self, playerInfo) 
    {
        const otherPlayer = self.physics.add.sprite(playerInfo.x, playerInfo.y, DUDE_KEY).setOrigin(0.5, 0.5);

        otherPlayer.setCollideWorldBounds(true);
        otherPlayer.setBounce(0);

        this.physics.add.collider(otherPlayer, this.platforms);
        //this.physics.add.collider(otherPlayer, this.otherPlayers);

        otherPlayer.playerId = playerInfo.playerId;
        self.otherPlayers.add(otherPlayer);
    }

}