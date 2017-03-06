invincibilityThreshold = 300; //miliseconds of time to ignore further collisions when a collision is detected
maxVelocity = 2; //because bounciness of asteroids is based on their mass,eventuallly one gets very fast asteroids (assuming no friction)

function Bubble (obj) {
	this.r 		= obj.r||10;
	this.pos 	= obj.pos||createVector(10,10);
	this.mag 	= obj.mag||1;
	this.col 	= obj.col||120;
	this.strokeCol = 255;
	this.family = obj.family||"";
	this.members = obj.members||[];
	

	this.isAsteroid = false;
	this.velocity = createVector(0,0);
	this.invincible = 0;
	
	this.setInitPosition = function (pos) {
		this.pos = pos;
		this.initPos = pos.copy();
	}
	
	
	
	this.intersectsMouse = function () {
		return (dist(this.pos.x, this.pos.y, mouseX, mouseY) < this.r);
	}
	
	this.isColliding = function (obj) {
		if (millis() - this.invincible < invincibilityThreshold) return false;
		var collisionDetected = (dist(this.pos.x, this.pos.y, obj.pos.x, obj.pos.y) < this.r + obj.r);
		return collisionDetected;
	}
	this.update = function () {
		this.pos.add(this.velocity); //adds the velocity to current position.
		this.windowBorder();
	}
	
	this.draw = function (){
		if (this.isAsteroid) this.drawAsteroid();
		else this.drawBubble();
	}
	
	this.drawBubble = function () {
		fill(this.col);
		ellipse(this.pos.x,this.pos.y,this.r*2,this.r*2);
		if (this.intersectsMouse()) {
			fill(255);	rect(mouseX,mouseY,150,30);
			fill(0); 	text(this.family,mouseX,mouseY,150,30);
		}
	}
	
	this.resetBubble = function (){
		this.pos = this.initPos.copy(); //needs to add copy or else INITPOS will be changed every time that POS changes
		this.velocity = createVector(0,0);
		this.isAsteroid = false;
	}
	
	this.drawAsteroid = function () {
		push();
		translate(this.pos.x, this.pos.y);
		stroke(this.strokeCol);
		noFill();
		beginShape();
		for (var i = 0; i < this.pointCount; i++) { //formulas: shiffman
			var angle = map(i, 0, this.pointCount, 0, TWO_PI);
			var r = this.r + this.edges[i];
			var x = r * cos(angle);
			var y = r * sin(angle);
			vertex(x, y);
		}
		endShape(CLOSE);
		pop();
		
		// noFill(); stroke(0,255,0); ellipse(this.pos.x,this.pos.y,this.r*2,this.r*2);
	}
	
	this.resetAsteroid = function (){
		this.velocity = p5.Vector.random2D();
		this.pointCount = max(10,floor(this.r)); //minimum 10 vertices
		this.edges = [];
		for (var i=0; i<this.pointCount;i++) {
			xoff = sqrt(this.r)*(i+1)/this.pointCount;	// xoff based on I so that each vertex gets a different noise. based on R so that only asteroid of similar size look similar
			this.edges.push(this.r*noise(xoff)-this.r/2);   // using perlin noise but scaling it correctly
			// console.log(xoff)
		}
		this.isAsteroid = true;
	}
	
	this.explode = function (placeInArray) {
		
		if (abs(this.velocity.x*this.velocity.y) <0.2) var childMag = this.velocity.mag()+2;
		else var childMag = this.velocity.mag();
		
		//next line requires a .copy() or else the pos of new child will always affect the parent
		var newBubbleObj = { pos: this.pos.copy(), r: this.r/2, mag: this.mag/2, family: this.family, members: this.members }
		var child1 = new Bubble(newBubbleObj)
		child1.resetAsteroid();
		child1.velocity = this.velocity.copy().rotate(PI/4).setMag(childMag);
		
		newBubbleObj.pos = this.pos.copy();
		var child2 = new Bubble(newBubbleObj)
		child2.resetAsteroid();
		child2.velocity = this.velocity.copy().rotate(7/4*PI).setMag(childMag);

		child1.invincible = millis()+200;
		child2.invincible = millis()+200;
		bubbles.splice(placeInArray,1); // removing parent from array
		bubbles.push(child1);
		bubbles.push(child2);
		
		// console.log(child2.velocity);
		// console.log(child2.velocity.mag(2));

	}
	
	this.bounces = function (bubble) {
		bubble.invincible = millis(); this.invincible = millis();
		
		//formulas: https://gamedevelopment.tutsplus.com/tutorials/when-worlds-collide-simulating-circle-circle-collisions--gamedev-769
		var collisionPointX = ((this.pos.x * bubble.r) + (bubble.pos.x * this.r)) / (this.r + bubble.r);
		var collisionPointY = ((this.pos.y * bubble.r) + (bubble.pos.y * this.r)) / (this.r + bubble.r);		
		fill(255,0,0);
		ellipse(collisionPointX,collisionPointY,10,10);

		//formulas: https://gamedevelopment.tutsplus.com/tutorials/when-worlds-collide-simulating-circle-circle-collisions--gamedev-769
		//formulas do not consider the tangent of the circle. only the angle of the vectors of the two objects		
		thisMass = this.r;
		bubbleMass = bubble.r;
		// if (bubbleMass > thisMass) bubbleMass *= .5; else thisMass *= .5;
		var thisNewVelX = (this.velocity.x * (thisMass - bubbleMass) + (2 * bubbleMass * bubble.velocity.x)) / (thisMass + bubbleMass);
		var thisNewVelY = (this.velocity.y * (thisMass - bubbleMass) + (2 * bubbleMass * bubble.velocity.y)) / (thisMass + bubbleMass);
		var bubbleNewVelX = (bubble.velocity.x * (bubbleMass - thisMass) + (2 * thisMass * this.velocity.x)) / (thisMass + bubbleMass);
		var bubbleNewVelY = (bubble.velocity.y * (bubbleMass - thisMass) + (2 * thisMass * this.velocity.y)) / (thisMass + bubbleMass);
		
		this.velocity.x = constrain(thisNewVelX,-1 * maxVelocity,maxVelocity);
		this.velocity.y = constrain(thisNewVelY,-1 * maxVelocity,maxVelocity);
		bubble.velocity.x = constrain(bubbleNewVelX,-1 * maxVelocity,maxVelocity);
		bubble.velocity.y = constrain(bubbleNewVelY,-1 * maxVelocity,maxVelocity);
	}
	
	this.windowBorder = function () {
		if (this.pos.x > width + this.r) {
			this.pos.x = -this.r;
		} else if (this.pos.x < -this.r) {
			this.pos.x = width + this.r;
		}
		if (this.pos.y > height + this.r) {
			this.pos.y = -this.r;
		} else if (this.pos.y < -this.r) {
			this.pos.y = height + this.r;
		}
	}
	
}