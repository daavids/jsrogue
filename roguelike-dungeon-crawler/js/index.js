/* 		DISCLAIMER
	I was following this tutorial/guide: 
	http://www.codingcookies.com/2013/04/01/building-a-roguelike-in-javascript-part-1/
	
	TODO: 
		>bug test
		>convert to es6	- done
  
  Useful resources: 
    https://www.npmjs.com/package/sprintf-js
    http://ondras.github.io/rot.js/
    http://www.roguebasin.com/index.php?title=Main_Page
		
*/
/*jshint sub:true*/
$(document).ready(() => {
	if (!ROT.isSupported()) {
		alert("The rot.js library is not supported by your browser! :(");
	} else {
		Game.init();
		$(".game").append(Game.getDisplay().getContainer());
		Game.switchScreen(Game.Screen.startScreen);
	}
});

var Game = {
	_display: null,
	_currentScreen: null,
	_screenWidth: 80,
	_screenHeight: 24,
	init() {
		// Any necessary initialization will go here.
		this._display = new ROT.Display({
			width: this._screenWidth,
			height: this._screenHeight + 1
		});
		// Create a helper function for binding to an event
		// and making it send it to the screen
		const game = this; // So that we don't lose this
		const bindEventToScreen = event => {
			window.addEventListener(event, e => {
				// When an event is received, send it to the
				// screen if there is one
				if (game._currentScreen !== null) {
					// Send the event type and data to the screen
					game._currentScreen.handleInput(event, e);
				}
			});
		};
		// Bind keyboard input events
		bindEventToScreen("keydown");
		//bindEventToScreen('keyup');
		bindEventToScreen("keypress");
	},
	getDisplay() {
		return this._display;
	},
	getScreenWidth() {
		return this._screenWidth;
	},
	getScreenHeight() {
		return this._screenHeight;
	},
	refresh() {
		// Clear the screen
		this._display.clear();
		// Render the screen
		this._currentScreen.render(this._display);
	},
	switchScreen(screen) {
		// If we had a screen before, notify it that we exited
		if (this._currentScreen !== null) {
			this._currentScreen.exit();
		}
		// Clear the display
		this.getDisplay().clear();
		// Update our current screen, notify it we entered
		// and then render it
		this._currentScreen = screen;
		if (!this._currentScreen !== null) {
			this._currentScreen.enter();
			this.refresh();
		}
	}
};
Game.extend = (src, dest) => {
	// Create a copy of the source.
	const result = {};
	for (var key in src) {
		result[key] = src[key];
	}
	// Copy over all keys from dest
	for (var key in dest) {
		result[key] = dest[key];
	}
	return result;
};

Game.Geometry = {
	// https://en.wikipedia.org/wiki/Bresenham's_line_algorithm
	getLine(startX, startY, endX, endY) {
		const points = [];
		const dx = Math.abs(endX - startX);
		const dy = Math.abs(endY - startY);
		const sx = startX < endX ? 1 : -1;
		const sy = startY < endY ? 1 : -1;
		let err = dx - dy;
		let e2;

		while (true) {
			points.push({ x: startX, y: startY });
			if (startX == endX && startY == endY) {
				break;
			}
			e2 = err * 2;
			if (e2 > -dx) {
				err -= dy;
				startX += sx;
			}
			if (e2 < dx) {
				err += dx;
				startY += sy;
			}
		}
		return points;
	}
};

Game.Screen = {};

// Define our initial start screen
Game.Screen.startScreen = {
	enter() {
		console.log("Entered start screen.");
	},
	exit() {
		console.log("Exited start screen.");
	},
	render(display) {
		// Render our prompt to the screen
		display.drawText(1, 1, "%c{yellow}Javascript Roguelike");
		display.drawText(1, 2, "Press [Enter] to start!");
	},
	handleInput(inputType, inputData) {
		// When [Enter] is pressed, go to the play screen
		if (inputType === "keydown") {
			if (inputData.keyCode === ROT.VK_RETURN) {
				Game.switchScreen(Game.Screen.playScreen);

			}
		}
	}
};

// Define our playing screen
Game.Screen.playScreen = {
	_map: null,
	_player: null,
	_gameEnded: false,
	_subScreen: null,
	enter() {
		// Create a map based on our size parameters
		const width = 100;
		const height = 48;
		const depth = 6;
		// Create our map from the tiles and player
		const tiles = new Game.Builder(width, height, depth).getTiles();
		this._player = new Game.Entity(Game.PlayerTemplate);
		this._map = new Game.Map.Cave(tiles, this._player);
		//this._map = new Game.Map(map, this._player);
		// Start the map's engine
		this._map.getEngine().start();
	},
	exit() {
		console.log("Exited play screen.");
	},
	render(display) {
		// Render subscreen if there is one
		if (this._subScreen) {
			this._subScreen.render(display);
			return;
		}
		const screenWidth = Game.getScreenWidth();
		const screenHeight = Game.getScreenHeight();

		// Render the tiles
		this.renderTiles(display);

		// Get the messages in the player's queue and render them
		const messages = this._player.getMessages();
		let messageY = 0;
		for (let i = 0; i < messages.length; i++) {
			// Draw each message, adding the number of lines
			messageY += display.drawText(
				0,
				messageY,
				`%c{white}%b{black}${messages[i]}`
			);
		}
		// Render player stats
		let stats = "%c{white}%b{black}";
		stats += vsprintf("HP: %d/%d L: %d XP: %d", [
			this._player.getHp(),
			this._player.getMaxHp(),
			this._player.getLevel(),
			this._player.getExperience()
		]);
		display.drawText(0, screenHeight, stats);
		// Render hunger state
		const hungerState = this._player.getHungerState();
		display.drawText(screenWidth - hungerState.length, screenHeight, hungerState);
	},
	getScreenOffsets() {
		// Make sure we still have enough space to fit an entire game screen
		let topLeftX = Math.max(0, this._player.getX() - Game.getScreenWidth() / 2);
		// Make sure we still have enough space to fit an entire game screen
		topLeftX = Math.min(
			topLeftX,
			this._player.getMap().getWidth() - Game.getScreenWidth()
		);
		// Make sure the y-axis isn't above the top border
		let topLeftY = Math.max(0, this._player.getY() - Game.getScreenHeight() / 2);
		// Make sure we still have enough space to fit an entire game screen
		topLeftY = Math.min(
			topLeftY,
			this._player.getMap().getHeight() - Game.getScreenHeight()
		);
		return {
			x: topLeftX,
			y: topLeftY
		};
	},
	renderTiles(display) {
		const screenWidth = Game.getScreenWidth();
		const screenHeight = Game.getScreenHeight();
		const offsets = this.getScreenOffsets();
		const topLeftX = offsets.x;
		const topLeftY = offsets.y;
		// This object will keep track of all visible map cells
		const visibleCells = {};
		// Store this._player.getMap() and player's z to prevent losing it in callbacks
		const map = this._player.getMap();
		const currentDepth = this._player.getZ();
		// Find all visible cells and update the object
		map
			.getFov(currentDepth)
			.compute(
				this._player.getX(),
				this._player.getY(),
				this._player.getSightRadius(),
				(x, y, radius, visibility) => {
					visibleCells[`${x},${y}`] = true;
					// Mark cell as explored
					map.setExplored(x, y, currentDepth, true);
				}
			);
		// Render the explored map cells
		for (let x = topLeftX; x < topLeftX + screenWidth; x++) {
			for (let y = topLeftY; y < topLeftY + screenHeight; y++) {
				if (map.isExplored(x, y, currentDepth)) {
					// Fetch the glyph for the tile and render it to the screen
					// at the offset position.
					let glyph = map.getTile(x, y, currentDepth);
					let foreground = glyph.getForeground();
					// If we are at a cell that is in the field of vision, we need
					// to check if there are items or entities.
					if (visibleCells[`${x},${y}`]) {
						// Check for items first, since we want to draw entities
						// over items.
						const items = map.getItemsAt(x, y, currentDepth);
						// If we have items, we want to render the top most item
						if (items) {
							glyph = items[items.length - 1];
						}
						// Check if we have an entity at the position
						if (map.getEntityAt(x, y, currentDepth)) {
							glyph = map.getEntityAt(x, y, currentDepth);
						}
						// Update the foreground color in case our glyph changed
						foreground = glyph.getForeground();
					} else {
						// Since the tile was previously explored but is not
						// visible, we want to change the foreground color to
						// dark gray.
						foreground = "darkGray";
					}
					display.draw(
						x - topLeftX,
						y - topLeftY,
						glyph.getChar(),
						foreground,
						glyph.getBackground()
					);
				}
			}
		}
	},
	handleInput(inputType, inputData) {
		// If the game is over, enter will bring the user to the losing screen.
		if (this._gameEnded) {
			if (inputType === "keydown" && inputData.keyCode === ROT.VK_RETURN) {
				Game.switchScreen(Game.Screen.loseScreen);
			}
			// Return to make sure the user can't still play
			return;
		}
		// Handle subscreen input if there is one
		if (this._subScreen) {
			this._subScreen.handleInput(inputType, inputData);
			return;
		}
		if (inputType === "keydown") {
			// Movement
			if (inputData.keyCode === ROT.VK_LEFT) {
				this.move(-1, 0, 0);
			} else if (inputData.keyCode === ROT.VK_RIGHT) {
				this.move(1, 0, 0);
			} else if (inputData.keyCode === ROT.VK_UP) {
				this.move(0, -1, 0);
			} else if (inputData.keyCode === ROT.VK_DOWN) {
				this.move(0, 1, 0);
			} else if (inputData.keyCode === ROT.VK_I) {
				// Show the inventory screen
				this.showItemsSubScreen(
					Game.Screen.inventoryScreen,
					this._player.getItems(),
					"You are not carrying anything."
				);
				return;
			} else if (inputData.keyCode === ROT.VK_D) {
				// Show the drop screen
				this.showItemsSubScreen(
					Game.Screen.dropScreen,
					this._player.getItems(),
					"You have nothing to drop."
				);
				return;
			} else if (inputData.keyCode === ROT.VK_E) {
				// Show the eat screen
				this.showItemsSubScreen(
					Game.Screen.eatScreen,
					this._player.getItems(),
					"You have nothing to eat."
				);
				return;
			} else if (inputData.keyCode === ROT.VK_W) {
				if (inputData.shiftKey) {
					// Show the wear screen
					this.showItemsSubScreen(
						Game.Screen.wearScreen,
						this._player.getItems(),
						"You have nothing to wear."
					);
				} else {
					this.showItemsSubScreen(
						Game.Screen.wieldScreen,
						this._player.getItems(),
						"You have nothing to wield."
					);
				}
				return;
			} else if (inputData.keyCode === ROT.VK_X) {
				// Show the examine screen
				this.showItemsSubScreen(
					Game.Screen.examineScreen,
					this._player.getItems(),
					"You have nothing to examine."
				);
				return;
			} else if (inputData.keyCode === ROT.VK_COMMA) {
				const items = this._player
					.getMap()
					.getItemsAt(this._player.getX(), this._player.getY(), this._player.getZ());
				// If there is only one item, directly pick it up.
				if (items && items.length === 1) {
					const item = items[0];
					if (this._player.pickupItems([0])) {
						Game.sendMessage(this._player, "You pick up %s", [item.describeA()]);
					} else {
						Game.sendMessage(
							this._player,
							"Your inventory is full! Nothing was picked up."
						);
					}
				} else {
					this.showItemsSubScreen(
						Game.Screen.pickupScreen,
						items,
						"There is nothing here to pick up."
					);
				}
			} else {
				// Not a valid key
				return;
			}
			// Unlock the engine
			this._player
				.getMap()
				.getEngine()
				.unlock();
		} else if (inputType === "keypress") {
			const keyChar = String.fromCharCode(inputData.charCode);
			if (keyChar === ">") {
				this.move(0, 0, 1);
			} else if (keyChar === "<") {
				this.move(0, 0, -1);
			} else if (keyChar === ";") {
				// Setup the look screen
				const offsets = this.getScreenOffsets();
				Game.Screen.lookScreen.setup(
					this._player,
					this._player.getX(),
					this._player.getY(),
					offsets.x,
					offsets.y
				);
				this.setSubScreen(Game.Screen.lookScreen);
				return;
			} else if (keyChar === "?") {
				// Setup the look screen
				this.setSubScreen(Game.Screen.helpScreen);
				return;
			} else {
				// Not a valid key
				return;
			}
			// Unlock the engine
			this._player
				.getMap()
				.getEngine()
				.unlock();
		}
	},
	move(dX, dY, dZ) {
		const newX = this._player.getX() + dX;
		const newY = this._player.getY() + dY;
		const newZ = this._player.getZ() + dZ;
		// Try to move to the new cell
		this._player.tryMove(newX, newY, newZ, this._player.getMap());
	},
	setGameEnded(gameEnded) {
		this._gameEnded = gameEnded;
	},
	setSubScreen(subScreen) {
		this._subScreen = subScreen;
		// Refresh screen on changing the subscreen
		Game.refresh();
	},
	showItemsSubScreen(subScreen, items, emptyMessage) {
		if (items && subScreen.setup(this._player, items) > 0) {
			this.setSubScreen(subScreen);
		} else {
			Game.sendMessage(this._player, emptyMessage);
			Game.refresh();
		}
	}
};

// Define our winning screen
Game.Screen.winScreen = {
	enter() {
		console.log("Entered win screen.");
	},
	exit() {
		console.log("Exited win screen.");
	},
	render(display) {
		// Render our prompt to the screen
		for (let i = 0; i < 22; i++) {
			// Generate random background colors
			const r = Math.round(Math.random() * 255);
			const g = Math.round(Math.random() * 255);
			const b = Math.round(Math.random() * 255);
			const background = ROT.Color.toRGB([r, g, b]);
			display.drawText(2, i + 1, `%b{${background}}You win!`);
		}
	},
	handleInput(inputType, inputData) {
		// Nothing to do here
	}
};

// Define our winning screen
Game.Screen.loseScreen = {
	enter() {
		console.log("Entered lose screen.");
	},
	exit() {
		console.log("Exited lose screen.");
	},
	render(display) {
		// Render our prompt to the screen
		for (let i = 0; i < 22; i++) {
			display.drawText(2, i + 1, "%b{red}You lose! :(");
		}
	},
	handleInput(inputType, inputData) {
		// Nothing to do here
	}
};

Game.Screen.ItemListScreen = function(template) {
	// Set up based on the template
	this._caption = template["caption"];
	this._okFunction = template["ok"];
	// By default, we use the identity function
	this._isAcceptableFunction =
		template["isAcceptable"] ||
		(x => x);
	// Whether the user can select items at all.
	this._canSelectItem = template["canSelect"];
	// Whether the user can select multiple items.
	this._canSelectMultipleItems = template["canSelectMultipleItems"];
	// Whether a 'no item' option should appear.
	this._hasNoItemOption = template["hasNoItemOption"];
};

Game.Screen.ItemListScreen.prototype.setup = function(player, items) {
	this._player = player;
	// Should be called before switching to the screen.
	let count = 0;
	// Iterate over each item, keeping only the aceptable ones and counting
	// the number of acceptable items.
	const that = this;
	this._items = items.map(item => {
		// Transform the item into null if it's not acceptable
		if (that._isAcceptableFunction(item)) {
			count++;
			return item;
		} else {
			return null;
		}
	});
	// Clean set of selected indices
	this._selectedIndices = {};
	return count;
};

Game.Screen.ItemListScreen.prototype.render = function(display) {
	const letters = "abcdefghijklmnopqrstuvwxyz";
	// Render the caption in the top row
	display.drawText(0, 0, this._caption);
	// Render the no item row if enabled
	if (this._hasNoItemOption) {
		display.drawText(0, 1, "0 - no item");
	}
	let row = 0;
	for (let i = 0; i < this._items.length; i++) {
		// If we have an item, we want to render it.
		if (this._items[i]) {
			// Get the letter matching the item's index
			const letter = letters.substring(i, i + 1);
			// If we have selected an item, show a +, else show a dash between
			// the letter and the item's name.
			const selectionState =
				this._canSelectItem &&
				this._canSelectMultipleItems &&
				this._selectedIndices[i]
					? "+"
					: "-";
			// Check if the item is worn or wielded.
			let suffix = "";
			if (this._items[i] === this._player.getArmor()) {
				suffix = " (wearing)";
			} else if (this._items[i] === this._player.getWeapon()) {
				suffix = " (wielding)";
			}
			// Render at the correct row and add 2.
			display.drawText(
				0,
				2 + row,
				`${letter} ${selectionState} ${this._items[i].describe()}${suffix}`
			);
			row++;
		}
	}
};

Game.Screen.ItemListScreen.prototype.executeOkFunction = function() {
	// Gather the selected items.
	const selectedItems = {};
	for (const key in this._selectedIndices) {
		selectedItems[key] = this._items[key];
	}
	// Switch back to the play screen.
	Game.Screen.playScreen.setSubScreen(undefined);
	// Call the OK function and end the player's turn if it return true.
	if (this._okFunction(selectedItems)) {
		this._player
			.getMap()
			.getEngine()
			.unlock();
	}
};
Game.Screen.ItemListScreen.prototype.handleInput = function(
	inputType,
	inputData
) {
	if (inputType === "keydown") {
		// If the user hit escape, hit enter and can't select an item, or hit
		// enter without any items selected, simply cancel out
		if (
			inputData.keyCode === ROT.VK_ESCAPE ||
			(inputData.keyCode === ROT.VK_RETURN &&
				(!this._canSelectItem || Object.keys(this._selectedIndices).length === 0))
		) {
			Game.Screen.playScreen.setSubScreen(undefined);
			// Handle pressing return when items are selected
		} else if (inputData.keyCode === ROT.VK_RETURN) {
			this.executeOkFunction();
			// Handle pressing zero when 'no item' selection is enabled.
		} else if (
			this._canSelectItem &&
			this._hasNoItemOption &&
			inputData.keyCode === ROT.VK_0
		) {
			this._selectedIndices = {};
			this.executeOkFunction();
			// Handle pressing a letter if we can select
		} else if (
			this._canSelectItem &&
			inputData.keyCode >= ROT.VK_A &&
			inputData.keyCode <= ROT.VK_Z
		) {
			// Check if it maps to a valid item by subtracting 'a' from the character
			// to know what letter of the alphabet we used.
			const index = inputData.keyCode - ROT.VK_A;
			if (this._items[index]) {
				// If multiple selection is allowed, toggle the selection status, else
				// select the item and exit the screen
				if (this._canSelectMultipleItems) {
					if (this._selectedIndices[index]) {
						delete this._selectedIndices[index];
					} else {
						this._selectedIndices[index] = true;
					}
					// Redraw screen
					Game.refresh();
				} else {
					this._selectedIndices[index] = true;
					this.executeOkFunction();
				}
			}
		}
	}
};

Game.Screen.inventoryScreen = new Game.Screen.ItemListScreen({
	caption: "Inventory",
	canSelect: false
});

Game.Screen.pickupScreen = new Game.Screen.ItemListScreen({
	caption: "Choose the items you wish to pickup",
	canSelect: true,
	canSelectMultipleItems: true,
	ok(selectedItems) {
		// Try to pick up all items, messaging the player if they couldn't all be
		// picked up.
		if (!this._player.pickupItems(Object.keys(selectedItems))) {
			Game.sendMessage(
				this._player,
				"Your inventory is full! Not all items were picked up."
			);
		}
		return true;
	}
});

Game.Screen.dropScreen = new Game.Screen.ItemListScreen({
	caption: "Choose the item you wish to drop",
	canSelect: true,
	canSelectMultipleItems: false,
	ok(selectedItems) {
		// Drop the selected item
		this._player.dropItem(Object.keys(selectedItems)[0]);
		return true;
	}
});

Game.Screen.eatScreen = new Game.Screen.ItemListScreen({
	caption: "Choose the item you wish to eat",
	canSelect: true,
	canSelectMultipleItems: false,
	isAcceptable(item) {
		return item && item.hasMixin("Edible");
	},
	ok(selectedItems) {
		// Eat the item, removing it if there are no consumptions remaining.
		const key = Object.keys(selectedItems)[0];
		const item = selectedItems[key];
		Game.sendMessage(this._player, "You eat %s.", [item.describeThe()]);
		item.eat(this._player);
		if (!item.hasRemainingConsumptions()) {
			this._player.removeItem(key);
		}
		return true;
	}
});

Game.Screen.wieldScreen = new Game.Screen.ItemListScreen({
	caption: "Choose the item you wish to wield",
	canSelect: true,
	canSelectMultipleItems: false,
	hasNoItemOption: true,
	isAcceptable(item) {
		return item && item.hasMixin("Equippable") && item.isWieldable();
	},
	ok(selectedItems) {
		// Check if we selected 'no item'
		const keys = Object.keys(selectedItems);
		if (keys.length === 0) {
			this._player.unwield();
			Game.sendMessage(this._player, "You are empty handed.");
		} else {
			// Make sure to unequip the item first in case it is the armor
			const item = selectedItems[keys[0]];
			this._player.unequip(item);
			this._player.wield(item);
			Game.sendMessage(this._player, "You are wielding %s.", [item.describeA()]);
		}
		return true;
	}
});

Game.Screen.wearScreen = new Game.Screen.ItemListScreen({
	caption: "Choose the item you wish to wear",
	canSelect: true,
	canSelectMultipleItems: false,
	hasNoItemOption: true,
	isAcceptable(item) {
		return item && item.hasMixin("Equippable") && item.isWearable();
	},
	ok(selectedItems) {
		// Check if we selected 'no item'
		const keys = Object.keys(selectedItems);
		if (keys.length === 0) {
			this._player.unwield();
			Game.sendMessage(this._player, "You are not wearing anything.");
		} else {
			// Make sure to unequip the item first in case it is the weapon.
			const item = selectedItems[keys[0]];
			this._player.unequip(item);
			this._player.wear(item);
			Game.sendMessage(this._player, "You are wearing %s.", [item.describeA()]);
		}
		return true;
	}
});

Game.Screen.gainStatScreen = {
	setup(entity) {
		// Must be called before rendering.
		this._entity = entity;
		this._options = entity.getStatOptions();
	},
	render(display) {
		const letters = "abcdefghijklmnopqrstuvwxyz";
		display.drawText(0, 0, "Choose a stat to increase: ");

		// Iterate through each of our options
		for (let i = 0; i < this._options.length; i++) {
			display.drawText(
				0,
				2 + i,
				`${letters.substring(i, i + 1)} - ${this._options[i][0]}`
			);
		}

		// Render remaining stat points
		display.drawText(
			0,
			4 + this._options.length,
			`Remaining points: ${this._entity.getStatPoints()}`
		);
	},
	handleInput(inputType, inputData) {
		if (inputType === "keydown") {
			// If a letter was pressed, check if it matches a valid option.
			if (inputData.keyCode >= ROT.VK_A && inputData.keyCode <= ROT.VK_Z) {
				// Check if it maps to a valid item by substracting 'a' from the character
				// to know what letter of the alphabet we used.
				const index = inputData.keyCode - ROT.VK_A;
				if (this._options[index]) {
					// Call the stat increasing function
					this._options[index][1].call(this._entity);
					// Decrease stat points
					this._entity.setStatPoints(this._entity.getStatPoints() - 1);
					// If we have no points left, exit the screen, else refresh
					if (this._entity.getStatPoints() === 0) {
						Game.Screen.playScreen.setSubScreen(undefined);
					} else {
						Game.refresh();
					}
				}
			}
		}
	}
};

Game.Screen.examineScreen = new Game.Screen.ItemListScreen({
	caption: "Choose the item you wish to examine",
	canSelect: true,
	canSelectMultipleItems: false,
	isAcceptable(item) {
		return true;
	},
	ok(selectedItems) {
		const keys = Object.keys(selectedItems);
		if (keys.length > 0) {
			const item = selectedItems[keys[0]];
			Game.sendMessage(this._player, "It is %s (%s).", [
				item.describeA(false),
				item.details()
			]);
		}
		return true;
	}
});

Game.Screen.TargetBasedScreen = function(template={}) {
    // By default, our ok return does nothing and does not consume a turn.
    this._isAcceptableFunction =
		template["okFunction"] ||
		((x, y) => false);
    // The default caption function simply returns an empty string.
    this._captionFunction =
		template["captionFunction"] ||
		((x, y) => "");
};

Game.Screen.TargetBasedScreen.prototype.setup = function(
	player,
	startX,
	startY,
	offsetX,
	offsetY
) {
	this._player = player;
	// Store original position. Substract the offset to make life easy, so we don't
	// always have to remove it.
	this._startX = startX - offsetX;
	this._startY = startY - offsetY;
	// Store current cursor position
	this._cursorX = this._startX;
	this._cursorY = this._startY;
	// Store map offsets
	this._offsetX = offsetX;
	this._offsetY = offsetY;
	// Cache the FOV
	const visibleCells = {};
	this._player
		.getMap()
		.getFov(this._player.getZ())
		.compute(
			this._player.getX(),
			this._player.getY(),
			this._player.getSightRadius(),
			(x, y, radius, visibility) => {
				visibleCells[`${x},${y}`] = true;
			}
		);
	this._visibleCells = visibleCells;
};

Game.Screen.TargetBasedScreen.prototype.render = function(display) {
	Game.Screen.playScreen.renderTiles.call(Game.Screen.playScreen, display);

	// Draw a line from the start to the cursor
	const points = Game.Geometry.getLine(
		this._startX,
		this._startY,
		this._cursorX,
		this._cursorY
	);

	// Render stars along the line
	for (let i = 0, l = points.length; i < l; i++) {
		display.drawText(points[i].x, points[i].y, "%c{magenta}*");
	}

	// Render the caption at the bottom
	display.drawText(
		0,
		Game.getScreenHeight() - 1,
		this._captionFunction(
			this._cursorX + this._offsetX,
			this._cursorY + this._offsetY
		)
	);
};

Game.Screen.TargetBasedScreen.prototype.handleInput = function(
	inputType,
	inputData
) {
	// Move the cursor
	if (inputType == "keydown") {
		if (inputData.keyCode === ROT.VK_LEFT) {
			this.moveCursor(-1, 0);
		} else if (inputData.keyCode === ROT.VK_RIGHT) {
			this.moveCursor(1, 0);
		} else if (inputData.keyCode === ROT.VK_UP) {
			this.moveCursor(0, -1);
		} else if (inputData.keyCode === ROT.VK_DOWN) {
			this.moveCursor(0, 1);
		} else if (inputData.keyCode === ROT.VK_ESCAPE) {
			Game.Screen.playScreen.setSubScreen(undefined);
		} else if (inputData.keyCode === ROT.VK_RETURN) {
			this.executeOkFunction();
		}
	}
	Game.refresh();
};

Game.Screen.TargetBasedScreen.prototype.moveCursor = function(dx, dy) {
	// Make sure we stay within bounds
	this._cursorX = Math.max(
		0,
		Math.min(this._cursorX + dx, Game.getScreenWidth())
	);
	// We have to save the last line for the caption.
	this._cursorY = Math.max(
		0,
		Math.min(this._cursorY + dy, Game.getScreenHeight() - 1)
	);
};

Game.Screen.TargetBasedScreen.prototype.executeOkFunction = function() {
	// Switch back to the play screen
	Game.Screen.playScreen.setSubScreen(undefined);
	// Call the OK function and end the player's turn if it returns true
	if (
		this._okFunction(this._cursorX + this._offsetX, this._cursorY + this._offsetY)
	) {
		this._player
			.getMap()
			.getEngine()
			.unlock();
	}
};

Game.Screen.lookScreen = new Game.Screen.TargetBasedScreen({
	captionFunction(x, y) {
		const z = this._player.getZ();
		const map = this._player.getMap();
		// If the tile is explored we can give a better caption
		if (map.isExplored(x, y, z)) {
			// If the tile isn't explored, we have to check if we can actually
			// see it before testing if there's an entity or item.
			if (this._visibleCells[`${x},${y}`]) {
				const items = map.getItemsAt(x, y, z);
				// If we have items, we want to render the topmost item
				if (items) {
					const item = items[items.length - 1];
					return String.format(
						"%s - %s (%s)",
						item.getRepresentation(),
						item.describeA(true),
						item.details()
					);
					// Else check if there's an entity
				} else if (map.getEntityAt(x, y, z)) {
					const entity = map.getEntityAt(x, y, z);
					return String.format(
						"%s -%s (%s)",
						entity.getRepresentation(),
						entity.describeA(true),
						entity.details()
					);
				}
			}
			// If there was no entity/item or the tile wasn't visible, then use
			// the tile information
			return String.format(
				"%s - %s",
				map.getTile(x, y, z).getRepresentation(),
				map.getTile(x, y, z).getDescription()
			);
		} else {
			// If the tile isn't explored, show the null tile description
			return String.format(
				"%s - %s",
				Game.Tile.nullTile.getRepresentation(),
				Game.Tile.nullTile.getDescription()
			);
		}
	}
});

Game.Screen.helpScreen = {
	render(display) {
		let text = "jsrogue help";
		const border = "-------------";
		let y = 0;
		display.drawText(Game.getScreenWidth() / 2 - text.length / 2, y++, text);
		display.drawText(Game.getScreenWidth() / 2 - text.length / 2, y++, border);
		display.drawText(
			0,
			y++,
			"The villagers have been complaining of a terrible smell coming from the cave."
		);
		display.drawText(0, y++, "Find the source of this smell and get rid of it!");
		y += 3;
		display.drawText(0, y++, "[,] to pick up items");
		display.drawText(0, y++, "[d] to drop items");
		display.drawText(0, y++, "[e] to eat items");
		display.drawText(0, y++, "[w] to wield items");
		display.drawText(0, y++, "[W] to wear items");
		display.drawText(0, y++, "[x] to examine items");
		display.drawText(0, y++, "[;] to look around you");
		display.drawText(0, y++, "[?] to show this help screen");
		y += 3;
		text = "--- press any key to continue ---";
		display.drawText(Game.getScreenWidth() / 2 - text.length / 2, y++, text);
	},
	handleInput(inputType, inputDate) {
		Game.Screen.playScreen.setSubScreen(null);
	}
};

Game.Glyph = function(properties={}) {
    this._char = properties["character"] || " ";
    this._foreground = properties["foreground"] || "white";
    this._background = properties["background"] || "black";
};

// Create standard getters for glyphs
Game.Glyph.prototype.getChar = function() {
	return this._char;
};
Game.Glyph.prototype.getBackground = function() {
	return this._background;
};
Game.Glyph.prototype.getForeground = function() {
	return this._foreground;
};
Game.Glyph.prototype.getRepresentation = function() {
	return (
		`%c{${this._foreground}}%b{${this._background}}${this._char}%c{white}%b{black}`
	);
};

//Dynamic  glyph
Game.DynamicGlyph = function(properties={}) {
    // Call the glyph's construtor with our set of properties
    Game.Glyph.call(this, properties);
    // Instantiate any properties from the passed object
    this._name = properties["name"] || "";
    // Create an object which will keep track what mixins we have
    // attached to this entity based on the name property
    this._attachedMixins = {};
    // Create a similar object for groups
    this._attachedMixinGroups = {};
    // Set up an object for listeners
    this._listeners = {};
    // Setup the object's mixins
    const mixins = properties["mixins"] || [];
    for (let i = 0; i < mixins.length; i++) {
		// Copy over all properties from each mixin as long
		// as it's not the name, init or listeners property. We
		// also make sure not to override a property that
		// already exists on the entity.
		for (var key in mixins[i]) {
			if (
				key != "init" &&
				key != "name" &&
				key != "listeners" &&
				!this.hasOwnProperty(key)
			) {
				this[key] = mixins[i][key];
			}
		}
		// Add the name of this mixin to our attached mixins
		this._attachedMixins[mixins[i].name] = true;
		// If a group name is present, add it
		if (mixins[i].groupName) {
			this._attachedMixinGroups[mixins[i].groupName] = true;
		}
		// Add all of our listeners
		if (mixins[i].listeners) {
			for (var key in mixins[i].listeners) {
				// If we don't already have a key for this event in our listeners
				// array, add it.
				if (!this._listeners[key]) {
					this._listeners[key] = [];
				}
				// Add the listener, if we don't already know about it.
				if (this._listeners[key].indexOf(mixins[i].listeners[key] === -1)) {
					this._listeners[key].push(mixins[i].listeners[key]);
				}
			}
		}
		// Finally call the init function if there is one
		if (mixins[i].init) {
			mixins[i].init.call(this, properties);
		}
	}
};
// Make dynamic glyphs inherit all the functionality from glyphs
Game.DynamicGlyph.extend(Game.Glyph);

Game.DynamicGlyph.prototype.hasMixin = function(obj) {
	// Allow passing the mixin itself or the name / group name as a string
	if (typeof obj === "object") {
		return this._attachedMixins[obj.name];
	} else {
		return this._attachedMixins[obj] || this._attachedMixinGroups[obj];
	}
};

Game.DynamicGlyph.prototype.setName = function(name) {
	this._name = name;
};

Game.DynamicGlyph.prototype.getName = function() {
	return this._name;
};

Game.DynamicGlyph.prototype.describe = function() {
	return this._name;
};
Game.DynamicGlyph.prototype.describeA = function(capitalize) {
	// Optional parameter to capitalize the a/an.
	const prefixes = capitalize ? ["A", "An"] : ["a", "an"];
	const string = this.describe();
	const firstLetter = string.charAt(0).toLowerCase();
	// If word starts by a vowel, use an, else use a. Note that this is not perfect.
	const prefix = "aeiou".includes(firstLetter) ? 1 : 0;

	return `${prefixes[prefix]} ${string}`;
};
Game.DynamicGlyph.prototype.describeThe = function(capitalize) {
	const prefix = capitalize ? "The" : "the";
	return `${prefix} ${this.describe()}`;
};

Game.DynamicGlyph.prototype.raiseEvent = function(event) {
	// Make sure we have at least one listener, or else exit
	if (!this._listeners[event]) {
		return;
	}
	// Extract any arguments passed, removing the event name
	const args = Array.prototype.slice.call(arguments, 1);
	// Invoke each listener, with this entity as the context and the arguments
	const results = [];
	for (let i = 0; i < this._listeners[event].length; i++) {
		results.push(this._listeners[event][i].apply(this, args));
	}
	return results;
};

Game.DynamicGlyph.prototype.details = function() {
	const details = [];
	const detailGroups = this.raiseEvent("details");
	// Iterate through each return value, grabbing the details from the arrays
	if (detailGroups) {
		for (let i = 0, l = detailGroups[i].length; i < l; i++) {
			if (detailGroups[i]) {
				for (let j = 0; j < detailGroups[i].length; j++) {
					details.push(`${detailGroups[i][j].key}: ${detailGroups[i][j].value}`);
				}
			}
		}
	}
	return details.join(", ");
};

Game.Tile = function(properties={}) {
    // Call the Glyph constructor with our properties
    Game.Glyph.call(this, properties);
    // Set up the properties. We use false by default.
    this._walkable = properties["walkable"] || false;
    this._diggable = properties["diggable"] || false;
    this._blocksLight =
		properties["blocksLight"] !== undefined ? properties["blocksLight"] : true;
    this._description = properties["description"] || "";
};
// Make tiles inherit all the functionality from glyphs
Game.Tile.extend(Game.Glyph);

// Standard getters
Game.Tile.prototype.isWalkable = function() {
	return this._walkable;
};
Game.Tile.prototype.isDiggable = function() {
	return this._diggable;
};
Game.Tile.prototype.isBlockingLight = function() {
	return this._blocksLight;
};
Game.Tile.prototype.getDescription = function() {
	return this._description;
};
Game.Tile.nullTile = new Game.Tile({ description: "(unknown)" });
Game.Tile.floorTile = new Game.Tile({
	character: ".",
	walkable: true,
	blocksLight: false,
	description: "A cave floor"
});
Game.Tile.wallTile = new Game.Tile({
	character: "#",
	foreground: "goldenrod",
	diggable: true,
	description: "A cave wall"
});
Game.Tile.stairsUpTile = new Game.Tile({
	character: "<",
	foreground: "white",
	walkable: true,
	blocksLight: false,
	description: "A rock staircase leading up"
});
Game.Tile.stairsDownTile = new Game.Tile({
	character: ">",
	foreground: "white",
	walkable: true,
	blocksLight: false,
	description: "A rock staircase leading down"
});

Game.Tile.holeToCavernTile = new Game.Tile({
	character: "O",
	foreground: "white",
	walkable: true,
	blocksLight: false,
	description: "A great dark hole in the ground"
});

Game.Tile.waterTile = new Game.Tile({
	character: "~",
	foreground: "blue",
	walkable: false,
	blocksLight: false,
	description: "Murky blue water"
});

// Helper function
Game.getNeighborPositions = (x, y) => {
	const tiles = [];
	// Generate all possible offsets
	for (let dX = -1; dX < 2; dX++) {
		for (let dY = -1; dY < 2; dY++) {
			// Make sure it isn't the same tile
			if (dX === 0 && dY === 0) {
				continue;
			}
			tiles.push({ x: x + dX, y: y + dY });
		}
	}
	return tiles.randomize();
};
Game.Builder = function(width, height, depth) {
	this._width = width;
	this._height = height;
	this._depth = depth;
	this._tiles = new Array(depth);
	this._regions = new Array(depth);
	// Instantiate the arrays to be multi-dimension
	for (var z = 0; z < depth; z++) {
		// Create a new cave at each level
		this._tiles[z] = this._generateLevel();
		// Setup the regions array for each depth
		this._regions[z] = new Array(width);
		for (let x = 0; x < width; x++) {
			this._regions[z][x] = new Array(height);
			// Fill with zeroes
			for (let y = 0; y < height; y++) {
				this._regions[z][x][y] = 0;
			}
		}
	}
	for (var z = 0; z < this._depth; z++) {
		this._setupRegions(z);
	}
	this._connectAllRegions();
};

Game.Builder.prototype.getTiles = function() {
	return this._tiles;
};
Game.Builder.prototype.getDepth = function() {
	return this._depth;
};
Game.Builder.prototype.getWidth = function() {
	return this._width;
};
Game.Builder.prototype.getHeight = function() {
	return this._height;
};

Game.Builder.prototype._generateLevel = function() {
	// Create the empty map
	const map = new Array(this._width);
	for (let w = 0; w < this._width; w++) {
		map[w] = new Array(this._height);
	}
	// Setup the cave generator
	const generator = new ROT.Map.Cellular(this._width, this._height);
	generator.randomize(0.5);
	const totalIterations = 3;
	// Iteratively smoothen the map
	for (let i = 0; i < totalIterations - 1; i++) {
		generator.create();
	}
	// Smoothen it one last time and then update our map
	generator.create((x, y, v) => {
		if (v === 1) {
			map[x][y] = Game.Tile.floorTile;
		} else {
			map[x][y] = Game.Tile.wallTile;
		}
	});
	return map;
};

Game.Builder.prototype._canFillRegion = function(x, y, z) {
	// Make sure the tile is within bounds
	if (
		x < 0 ||
		y < 0 ||
		z < 0 ||
		x >= this._width ||
		y >= this._height ||
		z >= this._depth
	) {
		return false;
	}
	// Make sure the tile does not already have a region
	if (this._regions[z][x][y] !== 0) {
		return false;
	}
	// Make sure the tile is walkable
	return this._tiles[z][x][y].isWalkable();
};

Game.Builder.prototype._fillRegion = function(region, x, y, z) {
	let tilesFilled = 1;
	const tiles = [{ x, y }];
	let tile;
	let neighbors;
	// Update the region of the original tile
	this._regions[z][x][y] = region;
	// Keep looping while we still have tiles to process
	while (tiles.length > 0) {
		tile = tiles.pop();
		// Get the neighbors of the tile
		neighbors = Game.getNeighborPositions(tile.x, tile.y);
		// Iterate through each neighbor, checking if we can use it to fill
		// and if so updating the region and adding it to our processing
		// list.
		while (neighbors.length > 0) {
			tile = neighbors.pop();
			if (this._canFillRegion(tile.x, tile.y, z)) {
				this._regions[z][tile.x][tile.y] = region;
				tiles.push(tile);
				tilesFilled++;
			}
		}
	}
	return tilesFilled;
};

// This removes all tiles at a given depth level with a region number.
// It fills the tiles with a wall tile.
Game.Builder.prototype._removeRegion = function(region, z) {
	for (let x = 0; x < this._width; x++) {
		for (let y = 0; y < this._height; y++) {
			if (this._regions[z][x][y] == region) {
				// Clear the region and set the tile to a wall tile
				this._regions[z][x][y] = 0;
				this._tiles[z][x][y] = Game.Tile.wallTile;
			}
		}
	}
};

// This sets up the regions for a given depth level.
Game.Builder.prototype._setupRegions = function(z) {
	let region = 1;
	let tilesFilled;
	// Iterate through all tiles searching for a tile that
	// can be used as the starting point for a flood fill
	for (let x = 0; x < this._width; x++) {
		for (let y = 0; y < this._height; y++) {
			if (this._canFillRegion(x, y, z)) {
				// Try to fill
				tilesFilled = this._fillRegion(region, x, y, z);
				// If it was too small, simply remove it
				if (tilesFilled <= 20) {
					this._removeRegion(region, z);
				} else {
					region++;
				}
			}
		}
	}
};

// This fetches a list of points that overlap between one
// region at a given depth level and a region at a level beneath it.
Game.Builder.prototype._findRegionOverlaps = function(z, r1, r2) {
	const matches = [];
	// Iterate through all tiles, checking if they respect
	// the region constraints and are floor tiles. We check
	// that they are floor to make sure we don't try to
	// put two stairs on the same tile.
	for (let x = 0; x < this._width; x++) {
		for (let y = 0; y < this._height; y++) {
			if (
				this._tiles[z][x][y] == Game.Tile.floorTile &&
				this._tiles[z + 1][x][y] == Game.Tile.floorTile &&
				this._regions[z][x][y] == r1 &&
				this._regions[z + 1][x][y] == r2
			) {
				matches.push({ x, y });
			}
		}
	}
	// We shuffle the list of matches to prevent bias
	return matches.randomize();
};

// This tries to connect two regions by calculating
// where they overlap and adding stairs
Game.Builder.prototype._connectRegions = function(z, r1, r2) {
	const overlap = this._findRegionOverlaps(z, r1, r2);
	// Make sure there was overlap
	if (overlap.length === 0) {
		return false;
	}
	// Select the first tile from the overlap and change it to stairs
	const point = overlap[0];
	this._tiles[z][point.x][point.y] = Game.Tile.stairsDownTile;
	this._tiles[z + 1][point.x][point.y] = Game.Tile.stairsUpTile;
	return true;
};

// This tries to connect all regions for each depth level,
// starting from the top most depth level.
Game.Builder.prototype._connectAllRegions = function() {
	for (let z = 0; z < this._depth - 1; z++) {
		// Iterate through each tile, and if we haven't tried
		// to connect the region of that tile on both depth levels
		// then we try. We store connected properties as strings
		// for quick lookups.
		const connected = {};
		let key;
		for (let x = 0; x < this._width; x++) {
			for (let y = 0; y < this._height; y++) {
				key = `${this._regions[z][x][y]},${this._regions[z + 1][x][y]}`;
				if (
					this._tiles[z][x][y] == Game.Tile.floorTile &&
					this._tiles[z + 1][x][y] == Game.Tile.floorTile &&
					!connected[key]
				) {
					// Since both tiles are floors and we haven't
					// already connected the two regions, try now.
					this._connectRegions(
						z,
						this._regions[z][x][y],
						this._regions[z + 1][x][y]
					);
					connected[key] = true;
				}
			}
		}
	}
};
Game.Map = function(tiles) {
	this._tiles = tiles;
	// Cache dimensions
	this._depth = tiles.length;
	this._width = tiles[0].length;
	this._height = tiles[0][0].length;
	// Setup the field of visions
	this._fov = [];
	this.setupFov();
	// Create a table which will hold the entities
	this._entities = {};
	// Create a table which will hold the items
	this._items = {};
	// Create the engine and scheduler
	this._scheduler = new ROT.Scheduler.Speed();
	this._engine = new ROT.Engine(this._scheduler);
	// Setup the explored array
	this._explored = new Array(this._depth);
	this._setupExploredArray();
};

Game.Map.prototype._setupExploredArray = function() {
	for (let z = 0; z < this._depth; z++) {
		this._explored[z] = new Array(this._width);
		for (let x = 0; x < this._width; x++) {
			this._explored[z][x] = new Array(this._height);
			for (let y = 0; y < this._height; y++) {
				this._explored[z][x][y] = false;
			}
		}
	}
};

// Standard getters
Game.Map.prototype.getDepth = function() {
	return this._depth;
};
Game.Map.prototype.getWidth = function() {
	return this._width;
};
Game.Map.prototype.getHeight = function() {
	return this._height;
};

// Gets the tile for a given coordinate set
Game.Map.prototype.getTile = function(x, y, z) {
	// Make sure we are inside the bounds. If we aren't, return
	// null tile.
	if (
		x < 0 ||
		x >= this._width ||
		y < 0 ||
		y >= this._height ||
		z < 0 ||
		z >= this._depth
	) {
		return Game.Tile.nullTile;
	} else {
		return this._tiles[z][x][y] || Game.Tile.nullTile;
	}
};

Game.Map.prototype.getPlayer = function() {
	return this._player;
};

Game.Map.prototype.dig = function(x, y, z) {
	// If the tile is diggable, update it to a floor
	if (this.getTile(x, y, z).isDiggable()) {
		this._tiles[z][x][y] = Game.Tile.floorTile;
	}
};

Game.Map.prototype.isEmptyFloor = function(x, y, z) {
	// Check if the tile is floor and also has no entity
	return (
		this.getTile(x, y, z) == Game.Tile.floorTile && !this.getEntityAt(x, y, z)
	);
};

Game.Map.prototype.setExplored = function(x, y, z, state) {
	// Only update if the tile is within bounds
	if (this.getTile(x, y, z) !== Game.Tile.nullTile) {
		this._explored[z][x][y] = state;
	}
};

Game.Map.prototype.isExplored = function(x, y, z) {
	// Only return the value if within bounds
	if (this.getTile(x, y, z) !== Game.Tile.nullTile) {
		return this._explored[z][x][y];
	} else {
		return false;
	}
};

Game.Map.prototype.setupFov = function() {
	// Keep this in 'map' variable so that we don't lose it.
	const map = this;
	// Iterate through each depth level, setting up the field of vision
	for (let z = 0; z < this._depth; z++) {
		// We have to put the following code in it's own scope to prevent the
		// depth variable from being hoisted out of the loop.
		((() => {
			// For each depth, we need to create a callback which figures out
			// if light can pass through a given tile.
			const depth = z;
			map._fov.push(
				new ROT.FOV.DiscreteShadowcasting(
					(x, y) => !map.getTile(x, y, depth).isBlockingLight(),
					{ topology: 4 }
				)
			);
		}))();
	}
};

Game.Map.prototype.getFov = function(depth) {
	return this._fov[depth];
};

Game.Map.prototype.getEngine = function() {
	return this._engine;
};
Game.Map.prototype.getEntities = function() {
	return this._entities;
};
Game.Map.prototype.getEntityAt = function(x, y, z) {
	// Get the entity based on position key
	return this._entities[`${x},${y},${z}`];
};
Game.Map.prototype.getEntitiesWithinRadius = function(
	centerX,
	centerY,
	centerZ,
	radius
) {
	results = [];
	// Determine our bounds
	const leftX = centerX - radius;
	const rightX = centerX + radius;
	const topY = centerY - radius;
	const bottomY = centerY + radius;
	// Iterate through our entities, adding any which are within the bounds
	for (const key in this._entities) {
		const entity = this._entities[key];
		if (
			entity.getX() >= leftX &&
			entity.getX() <= rightX &&
			entity.getY() >= topY &&
			entity.getY() <= bottomY &&
			entity.getZ() == centerZ
		) {
			results.push(entity);
		}
	}
	return results;
};

Game.Map.prototype.getRandomFloorPosition = function(z) {
    // Randomly generate a tile which is a floor
    let x;

    let y;
    do {
		x = Math.floor(Math.random() * this._width);
		y = Math.floor(Math.random() * this._height);
	} while (!this.isEmptyFloor(x, y, z));
    return { x, y, z };
};

Game.Map.prototype.addEntityAtRandomPosition = function(entity, z) {
	const position = this.getRandomFloorPosition(z);
	entity.setX(position.x);
	entity.setY(position.y);
	entity.setZ(position.z);
	this.addEntity(entity);
};

Game.Map.prototype.addEntity = function(entity) {
	// Update the entity's map
	entity.setMap(this);
	// Update the map with the entity's position
	this.updateEntityPosition(entity);
	// Check if this entity is an actor, and if so add
	// them to the scheduler
	if (entity.hasMixin("Actor")) {
		this._scheduler.add(entity, true);
	}
	// If the entity is the player, update the player field.
	if (entity.hasMixin(Game.EntityMixins.PlayerActor)) {
		this._player = undefined;
	}
};

Game.Map.prototype.removeEntity = function(entity) {
	// Remove the entity from the map
	const key = `${entity.getX()},${entity.getY()},${entity.getZ()}`;
	if (this._entities[key] == entity) {
		delete this._entities[key];
	}
	// If the entity is an actor, remove them from the scheduler
	if (entity.hasMixin("Actor")) {
		this._scheduler.remove(entity);
	}
};

Game.Map.prototype.updateEntityPosition = function(entity, oldX, oldY, oldZ) {
	// Delete the old key if it is the same entity and we have old positions.
	if (typeof oldX === "number") {
		const oldKey = `${oldX},${oldY},${oldZ}`;
		if (this._entities[oldKey] == entity) {
			delete this._entities[oldKey];
		}
	}
	// Make sure the entity's position is within bounds
	if (
		entity.getX() < 0 ||
		entity.getX() >= this._width ||
		entity.getY() < 0 ||
		entity.getY() >= this._height ||
		entity.getZ() < 0 ||
		entity.getZ() >= this._depth
	) {
		throw new Error("Entity's position is out of bounds.");
	}
	// Sanity check to make sure there is no entity at the new position.
	const key = `${entity.getX()},${entity.getY()},${entity.getZ()}`;
	if (this._entities[key]) {
		throw new Error("Tried to add an entity at an occupied position.");
	}
	// Add the entity to the table of entities
	this._entities[key] = entity;
};

Game.Map.prototype.getItemsAt = function(x, y, z) {
	return this._items[`${x},${y},${z}`];
};

Game.Map.prototype.setItemsAt = function(x, y, z, items) {
	// If our items array is empty, then delete the key from the table.
	const key = `${x},${y},${z}`;
	if (items.length === 0) {
		if (this._items[key]) {
			delete this._items[key];
		}
	} else {
		// Simply update the items at that key
		this._items[key] = items;
	}
};

Game.Map.prototype.addItem = function(x, y, z, item) {
	// If we already have items at that position, simply append the item to the
	// list of items.
	const key = `${x},${y},${z}`;
	if (this._items[key]) {
		this._items[key].push(item);
	} else {
		this._items[key] = [item];
	}
};

Game.Map.prototype.addItemAtRandomPosition = function(item, z) {
	const position = this.getRandomFloorPosition(z);
	this.addItem(position.x, position.y, position.z, item);
};

Game.Map.Cave = function(tiles, player) {
	// Call the Map constructor
	Game.Map.call(this, tiles);
	// Add the player
	this.addEntityAtRandomPosition(player, 0);
	// Add random entities and items to each floor.
	for (let z = 0; z < this._depth; z++) {
		// 15 entities per floor
		for (var i = 0; i < 15; i++) {
			const entity = Game.EntityRepository.createRandom();
			// Add a random entity
			this.addEntityAtRandomPosition(entity, z);
			// Level up the entity based on floor
			if (entity.hasMixin("ExperienceGainer")) {
				for (let level = 0; level < z; level++) {
					entity.giveExperience(
						entity.getNextLevelExperience() - entity.getExperience()
					);
				}
			}
		}
		// 15 items per floor
		for (var i = 0; i < 15; i++) {
			// Add a random item
			this.addItemAtRandomPosition(Game.ItemRepository.createRandom(), z);
		}
	}
	// Add weapoons and armor to the map in random positions and floors
	const templates = [
		"dagger",
		"sword",
		"staff",
		"tunic",
		"chainmail",
		"platemail"
	];
	for (var i = 0; i < templates.length; i++) {
		this.addItemAtRandomPosition(
			Game.ItemRepository.create(templates[i]),
			Math.floor(this._depth * Math.random())
		);
	}
	// Add a hole to the final cavern on the last level
	const holePosition = this.getRandomFloorPosition(this._depth - 1);
	this._tiles[this._depth - 1][holePosition.x][holePosition.y] =
		Game.Tile.holeToCavernTile;
};
Game.Map.Cave.extend(Game.Map);

Game.Map.BossCavern = function() {
	// Call the Map constructor
	Game.Map.call(this, this._generateTiles(80, 24));
	// Create the giant zombie
	this.addEntityAtRandomPosition(
		Game.EntityRepository.create("giant zombie"),
		0
	);
};
Game.Map.BossCavern.extend(Game.Map);

Game.Map.BossCavern.prototype._fillCircle = (tiles, centerX, centerY, radius, tile) => {
	// Copied from the DrawFilledCircle algorithm
	// http://stackoverflow.com/questions/1201200/fast-algorithm-for-drawing-filled-circles
	let x = radius;
	let y = 0;
	let xChange = 1 - (radius << 1);
	let yChange = 0;
	let radiusError = 0;

	while (x >= y) {
		for (var i = centerX - x; i <= centerX + x; i++) {
			tiles[i][centerY + y] = tile;
			tiles[i][centerY - y] = tile;
		}
		for (var i = centerX - y; i <= centerX + y; i++) {
			tiles[i][centerY + x] = tile;
			tiles[i][centerY - x] = tile;
		}

		y++;
		radiusError += yChange;
		yChange += 2;
		if ((radiusError << 1) + xChange > 0) {
			x--;
			radiusError += xChange;
			xChange += 2;
		}
	}
};

Game.Map.BossCavern.prototype._generateTiles = function(width, height) {
	// First we create an array, filling it with empty tiles.
	const tiles = new Array(width);
	for (let x = 0; x < width; x++) {
		tiles[x] = new Array(height);
		for (let y = 0; y < height; y++) {
			tiles[x][y] = Game.Tile.wallTile;
		}
	}
	// Now we determine the radius of the cave to carve out.
	var radius = (Math.min(width, height) - 2) / 2;
	this._fillCircle(tiles, width / 2, height / 2, radius, Game.Tile.floorTile);

	// Now we randomly position lakes (3 - 6 lakes).
	const lakes = Math.round(Math.random() * 3) + 3;
	const maxRadius = 2;
	for (let i = 0; i < lakes; i++) {
		// Random position, taking into consideration the radius to make sure
		// we are within the bounds.
		let centerX = Math.floor(Math.random() * (width - maxRadius * 2));
		let centerY = Math.floor(Math.random() * (height - maxRadius * 2));
		centerX += maxRadius;
		centerY += maxRadius;
		// Random radius
		var radius = Math.floor(Math.random() * maxRadius) + 1;
		// Position the lake
		this._fillCircle(tiles, centerX, centerY, radius, Game.Tile.waterTile);
	}

	// Return the tiles in an array as we only have 1 depth level.
	return [tiles];
};

Game.Map.BossCavern.prototype.addEntity = function(entity) {
	// Call super method.
	Game.Map.prototype.addEntity.call(this, entity);
	// If it's a player, place at random position
	if (this.getPlayer() === entity) {
		const position = this.getRandomFloorPosition(0);
		entity.setPosition(position.x, position.y, 0);
		// Start the engine!
		this.getEngine().start();
	}
};

Game.Entity = function(properties={}) {
    // Call the dynamic glyph's construtor with our set of properties
    Game.DynamicGlyph.call(this, properties);
    // Instantiate any properties from the passed object
    this._x = properties["x"] || 0;
    this._y = properties["y"] || 0;
    this._z = properties["z"] || 0;
    this._map = null;
    this._alive = true;
    // Acting speed
    this._speed = properties["speed"] || 1000;
};
// Make entities inherit all the functionality from dynamic glyphs
Game.Entity.extend(Game.DynamicGlyph);

Game.Entity.prototype.setX = function(x) {
	this._x = x;
};
Game.Entity.prototype.setY = function(y) {
	this._y = y;
};
Game.Entity.prototype.setZ = function(z) {
	this._z = z;
};
Game.Entity.prototype.setMap = function(map) {
	this._map = map;
};
Game.Entity.prototype.setPosition = function(x, y, z) {
	const oldX = this._x;
	const oldY = this._y;
	const oldZ = this._z;
	// Update position
	this._x = x;
	this._y = y;
	this._z = z;
	// If the entity is on a map, notify the map that the entity has moved.
	if (this._map) {
		this._map.updateEntityPosition(this, oldX, oldY, oldZ);
	}
};

Game.Entity.prototype.setSpeed = function(speed) {
	this._speed = speed;
};

Game.Entity.prototype.getSpeed = function() {
	return this._speed;
};

Game.Entity.prototype.getX = function() {
	return this._x;
};
Game.Entity.prototype.getY = function() {
	return this._y;
};
Game.Entity.prototype.getZ = function() {
	return this._z;
};
Game.Entity.prototype.getMap = function() {
	return this._map;
};

Game.Entity.prototype.tryMove = function(x, y, z, map) {
	var map = this.getMap();
	// Must use starting z
	const tile = map.getTile(x, y, this.getZ());
	const target = map.getEntityAt(x, y, this.getZ());
	// If our z level changed, check if we are on stair
	if (z < this.getZ()) {
		if (tile != Game.Tile.stairsUpTile) {
			Game.sendMessage(this, "You can't go up here!");
		} else {
			Game.sendMessage(this, "You ascend to level %d!", [z + 1]);
			this.setPosition(x, y, z);
		}
	} else if (z > this.getZ()) {
		if (
			tile === Game.Tile.holeToCavernTile &&
			this.hasMixin(Game.EntityMixins.PlayerActor)
		) {
			// Switch the entity to a boss cavern
			this.switchMap(new Game.Map.BossCavern());
		} else if (tile != Game.Tile.stairsDownTile) {
			Game.sendMessage(this, "You can't go down here!");
		} else {
			this.setPosition(x, y, z);
			Game.sendMessage(this, "You descend to level %d!", [z + 1]);
		}
		// If an entity was present at the tile
	} else if (target) {
		// An entity can only attack if the entity has the Attacker mixin and
		// either the entity or the target is the player.
		if (
			this.hasMixin("Attacker") &&
			(this.hasMixin(Game.EntityMixins.PlayerActor) ||
				target.hasMixin(Game.EntityMixins.PlayerActor))
		) {
			this.attack(target);
			return true;
		}
		// If not nothing we can do, but we can't
		// move to the tile
		return false;
		// Check if we can walk on the tile
		// and if so simply walk onto it
	} else if (tile.isWalkable()) {
		// Update the entity's position
		this.setPosition(x, y, z);
		// Notify the entity that there are items at this position
		const items = this.getMap().getItemsAt(x, y, z);
		if (items) {
			if (items.length === 1) {
				Game.sendMessage(this, "You see %s.", [items[0].describeA()]);
			} else {
				Game.sendMessage(this, "There are several objects here.");
			}
		}
		return true;
		// Check if the tile is diggable
	} else if (tile.isDiggable()) {
		// Only dig if the the entity is the player
		if (this.hasMixin(Game.EntityMixins.PlayerActor)) {
			map.dig(x, y, z);
			return true;
		}
		// If not nothing we can do, but we can't
		// move to the tile
		return false;
	}
	return false;
};
Game.Entity.prototype.isAlive = function() {
	return this._alive;
};
Game.Entity.prototype.kill = function(message) {
	// Only kill once!
	if (!this._alive) {
		return;
	}
	this._alive = false;
	if (message) {
		Game.sendMessage(this, message);
	} else {
		Game.sendMessage(this, "You have died!");
	}

	// Check if the player died, and if so call their act method to prompt the user.
	if (this.hasMixin(Game.EntityMixins.PlayerActor)) {
		this.act();
	} else {
		this.getMap().removeEntity(this);
	}
};

Game.Entity.prototype.switchMap = function(newMap) {
	// If it's the same map, nothing to do!
	if (newMap === this.getMap()) {
		return;
	}
	this.getMap().removeEntity(this);
	// Clear the position
	this._x = 0;
	this._y = 0;
	this._z = 0;
	// Add to the new map
	newMap.addEntity(this);
};

// Create our Mixins namespace
Game.EntityMixins = {};

// Main player's actor mixin
Game.EntityMixins.PlayerActor = {
	name: "PlayerActor",
	groupName: "Actor",
	act() {
		if (this._acting) {
			return;
		}
		this._acting = true;
		this.addTurnHunger();
		// Detect if the game is over
		if (!this.isAlive()) {
			Game.Screen.playScreen.setGameEnded(true);
			// Send a last message to the player
			Game.sendMessage(this, "Press [Enter] to continue!");
		}
		// Re-render the screen
		Game.refresh();
		// Lock the engine and wait asynchronously
		// for the player to press a key.
		this.getMap()
			.getEngine()
			.lock();
		// Clear the message queue
		this.clearMessages();
		this._acting = false;
	}
};

Game.EntityMixins.FungusActor = {
	name: "FungusActor",
	groupName: "Actor",
	init() {
		this._growthsRemaining = 5;
	},
	act() {
		// Check if we are going to try growing this turn
		if (this._growthsRemaining > 0) {
			if (Math.random() <= 0.02) {
				// Generate the coordinates of a random adjacent square by
				// generating an offset between [-1, 0, 1] for both the x and
				// y directions. To do this, we generate a number from 0-2 and then
				// subtract 1.
				const xOffset = Math.floor(Math.random() * 3) - 1;
				const yOffset = Math.floor(Math.random() * 3) - 1;
				// Make sure we aren't trying to spawn on the same tile as us
				if (xOffset !== 0 || yOffset !== 0) {
					// Check if we can actually spawn at that location, and if so
					// then we grow!
					if (
						this.getMap().isEmptyFloor(
							this.getX() + xOffset,
							this.getY() + yOffset,
							this.getZ()
						)
					) {
						const entity = Game.EntityRepository.create("fungus");
						entity.setPosition(
							this.getX() + xOffset,
							this.getY() + yOffset,
							this.getZ()
						);
						this.getMap().addEntity(entity);
						this._growthsRemaining--;
						// Send a message nearby!
						Game.sendMessageNearby(
							this.getMap(),
							entity.getX(),
							entity.getY(),
							entity.getZ(),
							"The fungus is spreading!"
						);
					}
				}
			}
		}
	}
};

// This signifies our entity can attack basic destructible enities
Game.EntityMixins.Attacker = {
	name: "Attacker",
	groupName: "Attacker",
	init(template) {
		this._attackValue = template["attackValue"] || 1;
	},
	getAttackValue() {
		let modifier = 0;
		// If we can equp items, then we have to take into
		// consideration weapon and armor
		if (this.hasMixin(Game.EntityMixins.Equipper)) {
			if (this.getWeapon()) {
				modifier += this.getWeapon().getAttackValue();
			}
			if (this.getArmor()) {
				modifier += this.getArmor().getAttackValue();
			}
		}
		return this._attackValue + modifier;
	},
	increaseAttackValue(value=2) {
        // Add to the attack value.
        this._attackValue += value;
        Game.sendMessage(this, "You look stronger!");
    },
	attack(target) {
		// If the target is destructible, calculate the damage
		// based on attack and defense value
		if (target.hasMixin("Destructible")) {
			const attack = this.getAttackValue();
			const defense = target.getDefenseValue();
			const max = Math.max(0, attack - defense);
			const damage = 1 + Math.floor(Math.random() * max);

			Game.sendMessage(this, "You strike the %s for %d damage!", [
				target.getName(),
				damage
			]);
			Game.sendMessage(target, "The %s strikes you for %d damage!", [
				this.getName(),
				damage
			]);

			target.takeDamage(this, damage);
		}
	},
	listeners: {
		details() {
			return [{ key: "attack", value: this.getAttackValue() }];
		}
	}
};

// This mixin signifies an entity can take damage and be destroyed
Game.EntityMixins.Destructible = {
	name: "Destructible",
	init(template) {
		this._maxHp = template["maxHp"] || 10;
		// We allow taking in health from the template incase we want
		// the entity to start with a different amount of HP than the
		// max specified.
		this._hp = template["hp"] || this._maxHp;
		this._defenseValue = template["defenseValue"] || 0;
	},
	getDefenseValue() {
		let modifier = 0;
		// If we can equp items, then we have to take into
		// consideration weapon and armor
		if (this.hasMixin(Game.EntityMixins.Equipper)) {
			if (this.getWeapon()) {
				modifier += this.getWeapon().getDefenseValue();
			}
			if (this.getArmor()) {
				modifier += this.getArmor().getDefenseValue();
			}
		}
		return this._defenseValue + modifier;
	},
	setHp(hp) {
		this._hp = hp;
	},
	getHp() {
		return this._hp;
	},
	getMaxHp() {
		return this._maxHp;
	},
	increaseDefenseValue(value=2) {
        // Add to the defense value.
        this._defenseValue += value;
        Game.sendMessage(this, "You look tougher!");
    },
	increaseMaxHp(value=10) {
        // Add to both max HP and HP.
        this._maxHp += value;
        this._hp += value;
        Game.sendMessage(this, "You look healthier!");
    },
	takeDamage(attacker, damage) {
		this._hp -= damage;
		// If have 0 or less HP, then remove ourseles from the map
		if (this._hp <= 0) {
			Game.sendMessage(attacker, "You kill the %s!", [this.getName()]);
			// Raise events
			this.raiseEvent("onDeath", attacker);
			attacker.raiseEvent("onKill", this);
			this.kill();
		}
	},
	listeners: {
		onGainLevel() {
			// Heal the entity.
			this.setHp(this.getMaxHp());
		},
		details() {
			return [
				{ key: "defense", value: this.getDefenseValue() },
				{ key: "hp", value: this.getHp() }
			];
		}
	}
};

Game.EntityMixins.MessageRecipient = {
	name: "MessageRecipient",
	init(template) {
		this._messages = [];
	},
	receiveMessage(message) {
		this._messages.push(message);
	},
	getMessages() {
		return this._messages;
	},
	clearMessages() {
		this._messages = [];
	}
};

// This signifies our entity posseses a field of vision of a given radius.
Game.EntityMixins.Sight = {
	name: "Sight",
	groupName: "Sight",
	init(template) {
		this._sightRadius = template["sightRadius"] || 5;
	},
	getSightRadius() {
		return this._sightRadius;
	},
	increaseSightRadius(value=1) {
        // Add to sight radius.
        this._sightRadius += value;
        Game.sendMessage(this, "You are more aware of your surroundings!");
    },
	canSee(entity) {
		// If not on the same map or on different floors, exit early
		if (!entity || this._map !== entity.getMap() || this._z !== entity.getZ()) {
			return false;
		}
		const otherX = entity.getX();
		const otherY = entity.getY();

		// If we're not in a square FOV, then we won't be in a real
		// FOV either
		if (
			(otherX - this._x) * (otherX - this._x) +
				(otherY - this._y) * (otherY - this._y) >
			this._sightRadius * this._sightRadius
		) {
			return false;
		}
		// Compute the FOV and check if the coordinates are in there.
		let found = false;
		this.getMap()
			.getFov(this.getZ())
			.compute(this.getX(), this.getY(), this.getSightRadius(), (x, y, radius, visibility) => {
				if (x === otherX && y === otherY) {
					found = true;
				}
			});
		return found;
	}
};

// Message sending functions
Game.sendMessage = (recipient, message, args) => {
	// Make sure the recipient can receive the message
	// before doing any work.
	if (recipient.hasMixin(Game.EntityMixins.MessageRecipient)) {
		// If args were passed, then we format the message, else
		// no formatting is necessary
		if (args) {
			message = vsprintf(message, args);
		}
		recipient.receiveMessage(message);
	}
};
Game.sendMessageNearby = (map, centerX, centerY, centerZ, message, args) => {
	// If args were passed, then we format the message, else
	// no formatting is necessary
	if (args) {
		message = vsprintf(message, args);
	}
	// Get the nearby entities
	entities = map.getEntitiesWithinRadius(centerX, centerY, centerZ, 5);
	// Iterate through nearby entities, sending the message if
	// they can receive it.
	for (let i = 0; i < entities.length; i++) {
		if (entities[i].hasMixin(Game.EntityMixins.MessageRecipient)) {
			entities[i].receiveMessage(message);
		}
	}
};

Game.EntityMixins.InventoryHolder = {
	name: "InventoryHolder",
	init(template) {
		// Default to 10 inventory slots.
		const inventorySlots = template["inventorySlots"] || 10;
		// Set up an empty inventory.
		this._items = new Array(inventorySlots);
	},
	getItems() {
		return this._items;
	},
	getItem(i) {
		return this._items[i];
	},
	addItem(item) {
		// Try to find a slot, returning true only if we could add the item.
		for (let i = 0; i < this._items.length; i++) {
			if (!this._items[i]) {
				this._items[i] = item;
				return true;
			}
		}
		return false;
	},
	removeItem(i) {
		// If we can equip items, then make sure we unequip the item we are removing.
		if (this._items[i] && this.hasMixin(Game.EntityMixins.Equipper)) {
			this.unequip(this._items[i]);
		}
		// Simply clear the inventory slot.
		this._items[i] = null;
	},
	canAddItem() {
		// Check if we have an empty slot.
		for (let i = 0; i < this._items.length; i++) {
			if (!this._items[i]) {
				return true;
			}
		}
		return false;
	},
	pickupItems(indices) {
		// Allows the user to pick up items from the map, where indices is
		// the indices for the array returned by map.getItemsAt
		const mapItems = this._map.getItemsAt(this.getX(), this.getY(), this.getZ());
		let added = 0;
		// Iterate through all indices.
		for (let i = 0; i < indices.length; i++) {
			// Try to add the item. If our inventory is not full, then splice the
			// item out of the list of items. In order to fetch the right item, we
			// have to offset the number of items already added.
			if (this.addItem(mapItems[indices[i] - added])) {
				mapItems.splice(indices[i] - added, 1);
				added++;
			} else {
				// Inventory is full
				break;
			}
		}
		// Update the map items
		this._map.setItemsAt(this.getX(), this.getY(), this.getZ(), mapItems);
		// Return true only if we added all items
		return added === indices.length;
	},
	dropItem(i) {
		// Drops an item to the current map tile
		if (this._items[i]) {
			if (this._map) {
				this._map.addItem(this.getX(), this.getY(), this.getZ(), this._items[i]);
			}
			this.removeItem(i);
		}
	}
};

Game.EntityMixins.FoodConsumer = {
	name: "FoodConsumer",
	init(template) {
		this._maxFullness = template["maxFullness"] || 1000;
		// Start halfway to max fullness if no default value
		this._fullness = template["fullness"] || this._maxFullness / 2;
		// Number of points to decrease fullness by every turn.
		this._fullnessDepletionRate = template["fullnessDepletionRate"] || 1;
	},
	addTurnHunger() {
		// Remove the standard depletion points
		this.modifyFullnessBy(-this._fullnessDepletionRate);
	},
	modifyFullnessBy(points) {
		this._fullness = this._fullness + points;
		if (this._fullness <= 0) {
			this.kill("You have died of starvation!");
		} else if (this._fullness > this._maxFullness) {
			this.kill("You choke and die!");
		}
	},
	getHungerState() {
		// Fullness points per percent of max fullness
		const perPercent = this._maxFullness / 100;
		// 5% of max fullness or less = starving
		if (this._fullness <= perPercent * 5) {
			return "Starving";
			// 25% of max fullness or less = hungry
		} else if (this._fullness <= perPercent * 25) {
			return "Hungry";
			// 95% of max fullness or more = oversatiated
		} else if (this._fullness >= perPercent * 95) {
			return "Oversatiated";
			// 75% of max fullness or more = full
		} else if (this._fullness >= perPercent * 75) {
			return "Full";
			// Anything else = not hungry
		} else {
			return "Not Hungry";
		}
	}
};

Game.EntityMixins.CorpseDropper = {
	name: "CorpseDropper",
	init(template) {
		// Chance of dropping a cropse (out of 100).
		this._corpseDropRate = template["corpseDropRate"] || 100;
	},
	listeners: {
		onDeath(attacker) {
			if (Math.round(Math.random() * 100) < this._corpseDropRate) {
				// Create a new corpse item and drop it.
				this._map.addItem(
					this.getX(),
					this.getY(),
					this.getZ(),
					Game.ItemRepository.create("corpse", {
						name: `${this._name} corpse`,
						foreground: this._foreground
					})
				);
			}
		}
	}
};

Game.EntityMixins.Equipper = {
	name: "Equipper",
	init(template) {
		this._weapon = null;
		this._armor = null;
	},
	wield(item) {
		this._weapon = item;
	},
	unwield(item) {
		this._weapon = null;
	},
	wear(item) {
		this._armor = item;
	},
	takeOff(item) {
		this._armor = null;
	},
	getWeapon() {
		return this._weapon;
	},
	getArmor() {
		return this._armor;
	},
	unequip(item) {
		// Helper function to be called before getting rid of an item.
		if (this._weapon === item) {
			this.unwield();
		}
		if (this._armor === item) {
			this.takeOff();
		}
	}
};

Game.EntityMixins.TaskActor = {
	name: "TaskActor",
	groupName: "Actor",
	init(template) {
		// Load tasks
		this._tasks = template["tasks"] || ["wander"];
	},
	act() {
		// Iterate through all of our tasks
		for (let i = 0; i < this._tasks.length; i++) {
			if (this.canDoTask(this._tasks[i])) {
				// If we can perform the task, execute the function for it.
				this[this._tasks[i]]();
				return;
			}
		}
	},
	canDoTask(task) {
		if (task === "hunt") {
			return this.hasMixin("Sight") && this.canSee(this.getMap().getPlayer());
		} else if (task === "wander") {
			return true;
		} else {
			throw new Error(`Tried to perform undefined task ${task}`);
		}
	},
	hunt() {
		const player = this.getMap().getPlayer();

		// If we are adjacent to the player, then attack instead of hunting.
		const offsets =
			Math.abs(player.getX() - this.getX()) +
			Math.abs(player.getY() - this.getY());
		if (offsets === 1) {
			if (this.hasMixin("Attacker")) {
				this.attack(player);
				return;
			}
		}

		// Generate the path and move to first tile.
		const source = this;
		const z = source.getZ();
		const path = new ROT.Path.AStar(
			player.getX(),
			player.getY(),
			(x, y) => {
				// If an entity is present at the tile, can't move there.
				const entity = source.getMap().getEntityAt(x, y, z);
				if (entity && entity !== player && entity !== source) {
					return false;
				}
				return source
					.getMap()
					.getTile(x, y, z)
					.isWalkable();
			},
			{ topology: 4 }
		);
		// Once we've gotten the path, we want to move to the second cell that is
		// passed in hte callback (the first is the entity's starting point)
		let count = 0;
		path.compute(source.getX(), source.getY(), (x, y) => {
			if (count === 1) {
				source.tryMove(x, y, z);
			}
			count++;
		});
	},
	wander() {
		// Flip coin to determine if moving by 1 in the positive or negative direction
		const moveOffset = Math.round(Math.random()) === 1 ? 1 : -1;
		// Flip coin to determine if moving in x or y direction
		if (Math.round(Math.random()) === 1) {
			this.tryMove(this.getX() + moveOffset, this.getY(), this.getZ());
		} else {
			this.tryMove(this.getX(), this.getY() + moveOffset, this.getZ());
		}
	}
};

Game.EntityMixins.ExperienceGainer = {
	name: "ExperienceGainer",
	init(template) {
		this._level = template["level"] || 1;
		this._experience = template["experience"] || 0;
		this._statPointsPerLevel = template["statPointsPerLevel"] || 1;
		this._statPoints = 0;
		// Determine what stats can be leveled up.
		this._statOptions = [];
		if (this.hasMixin("Attacker")) {
			this._statOptions.push(["Increase attack value", this.increaseAttackValue]);
		}
		if (this.hasMixin("Destructible")) {
			this._statOptions.push([
				"Increase defense value",
				this.increaseDefenseValue
			]);
			this._statOptions.push(["Increase max health", this.increaseMaxHp]);
		}
		if (this.hasMixin("Sight")) {
			this._statOptions.push(["Increase sight range", this.increaseSightRadius]);
		}
	},
	getLevel() {
		return this._level;
	},
	getExperience() {
		return this._experience;
	},
	getNextLevelExperience() {
		return this._level * this._level * 10;
	},
	getStatPoints() {
		return this._statPoints;
	},
	setStatPoints(statPoints) {
		this._statPoints = statPoints;
	},
	getStatOptions() {
		return this._statOptions;
	},
	giveExperience(points) {
		let statPointsGained = 0;
		let levelsGained = 0;
		// Loop until we've allocated all points.
		while (points > 0) {
			// Check if adding in the points will surpass the level treshold.
			if (this._experience + points >= this.getNextLevelExperience()) {
				// Fill our experience till the next treshold.
				const usedPoints = this.getNextLevelExperience() - this._experience;
				points -= usedPoints;
				this._experience += usedPoints;
				// Level up our entity!
				this._level++;
				levelsGained++;
				this._statPoints += this._statPointsPerLevel;
				statPointsGained += this._statPointsPerLevel;
			} else {
				// Simple case - just give the experience.
				this._experience += points;
				points = 0;
			}
		}
		// Check if we gained atleast one leve.
		if (levelsGained > 0) {
			Game.sendMessage(this, "You advance to level %d.", [this._level]);
			this.raiseEvent("onGainLevel");
		}
	},
	listeners: {
		onKill(victim) {
			let exp = victim.getMaxHp() + victim.getDefenseValue();
			if (victim.hasMixin("Attacker")) {
				exp += victim.getAttackValue();
			}
			// Accoutn for level differences
			if (victim.hasMixin("ExperienceGainer")) {
				exp -= (this.getLevel() - victim.getLevel()) * 3;
			}
			// Only give experience if more than 0.
			if (exp > 0) {
				this.giveExperience(exp);
			}
		},
		details() {
			return [{ key: "level", value: this.getLevel() }];
		}
	}
};

Game.EntityMixins.RandomStatGainer = {
	name: "RandomStatGainer",
	groupName: "StatGainer",
	listeners: {
		onGainLevel() {
			const statOptions = this.getStatOptions();
			// Randomly select a stat option and execute the callback for each
			// stat point
			while (this.getStatPoints() > 0) {
				// Call the stat increasing function with this as the context.
				statOptions.random()[1].call(this);
				this.setStatPoints(this.getStatPoints() - 1);
			}
		}
	}
};

Game.EntityMixins.PlayerStatGainer = {
	name: "PlayerStatGainer",
	groupName: "StatGainer",
	listeners: {
		onGainLevel() {
			// Setup the gain stat screen and show it
			Game.Screen.gainStatScreen.setup(this);
			Game.Screen.playScreen.setSubScreen(Game.Screen.gainStatScreen);
		}
	}
};

Game.EntityMixins.GiantZombieActor = Game.extend(Game.EntityMixins.TaskActor, {
	init(template) {
		// Call the task actor init with the right tasks.
		Game.EntityMixins.TaskActor.init.call(
			this,
			Game.extend(template, {
				tasks: ["growArm", "spawnSlime", "hunt", "wander"]
			})
		);
		// We only want to grow the arm once.
		this._hasGrownArm = false;
	},
	canDoTask(task) {
		// If we haven't already grown arm and HP <= 20, then we can grow.
		if (task === "growArm") {
			return this.getHp() <= 20 && !this._hasGrownArm;
			// Spawn a slime only a 10% of turns
		} else if (task === "spawnSlime") {
			return Math.round(Math.random() * 100) <= 10;
			// Call parent canDoTask
		} else {
			return Game.EntityMixins.TaskActor.canDoTask.call(this, task);
		}
	},
	growArm() {
		this._hasGrownArm = true;
		this.increaseAttackValue(5);
		// Send a message saying the zombie grew an arm.
		Game.sendMessageNearby(
			this.getMap(),
			this.getX(),
			this.getY(),
			this.getZ(),
			"An extra arm appears on the giant zombie!"
		);
	},
	spawnSlime() {
		// Generate a random position nearby
		const xOffset = Math.floor(Math.random() * 3) - 1;
		const yOffset = Math.floor(Math.random() * 3) - 1;

		// check if we can spawn an entity at that position.
		if (
			!this.getMap().isEmptyFloor(
				this.getX() + xOffset,
				this.getY() + yOffset,
				this.getZ()
			)
		) {
			// If we can't do nothing
			return;
		}
		// Create the entity
		const slime = Game.EntityRepository.create("slime");
		slime.setX(this.getX() + xOffset);
		slime.setY(this.getY() + yOffset);
		slime.setZ(this.getZ());
		this.getMap().addEntity(slime);
	},
	listeners: {
		onDeath(attacker) {
			// Switch to win screen when killed!
			Game.switchScreen(Game.Screen.winScreen);
		}
	}
});

Game.Item = function(properties={}) {
    // Call the dynamic glyph's construtor with our set of properties
    Game.DynamicGlyph.call(this, properties);
};
// Make items inherit all the functionality from dynamic glyphs
Game.Item.extend(Game.DynamicGlyph);

Game.ItemMixins = {};

// Edible mixin
Game.ItemMixins.Edible = {
	name: "Edible",
	init(template) {
		// Number of points to add to hunger
		this._foodValue = template["foodValue"] || 5;
		// Number of times the item can be consumed
		this._maxConsumptions = template["consumptions"] || 1;
		this._remainingConsumptions = this._maxConsumptions;
	},
	eat(entity) {
		if (entity.hasMixin("FoodConsumer")) {
			if (this.hasRemainingConsumptions()) {
				entity.modifyFullnessBy(this._foodValue);
				this._remainingConsumptions--;
			}
		}
	},
	hasRemainingConsumptions() {
		return this._remainingConsumptions > 0;
	},
	describe() {
		if (this._maxConsumptions != this._remainingConsumptions) {
			return `partly eaten ${Game.Item.prototype.describe.call(this)}`;
		} else {
			return this._name;
		}
	},
	listeners: {
		details() {
			return [{ key: "food", value: this._foodValue }];
		}
	}
};

Game.ItemMixins.Equippable = {
	name: "Equippable",
	init(template) {
		this._attackValue = template["attackValue"] || 0;
		this._defenseValue = template["defenseValue"] || 0;
		this._wieldable = template["wieldable"] || false;
		this._wearable = template["wearable"] || false;
	},
	getAttackValue() {
		return this._attackValue;
	},
	getDefenseValue() {
		return this._defenseValue;
	},
	isWieldable() {
		return this._wieldable;
	},
	isWearable() {
		return this._wearable;
	},
	listeners: {
		details() {
			const results = [];
			if (this._wieldable) {
				results.push({ key: "attack", value: this.getAttackValue() });
			}
			if (this._wearable) {
				results.push({ key: "defense", value: this.getDefenseValue() });
			}
			return results;
		}
	}
};

// A repository has a name and a constructor. The constructor is used to create
// items in the repository.
Game.Repository = function(name, ctor) {
	this._name = name;
	this._templates = {};
	this._ctor = ctor;
	this._randomTemplates = {};
};

// Define a new named template.
Game.Repository.prototype.define = function(name, template, options) {
	this._templates[name] = template;
	// Apply any options
	const disableRandomCreation = options && options["disableRandomCreation"];
	if (!disableRandomCreation) {
		this._randomTemplates[name] = template;
	}
};

// Create an object based on a template.
Game.Repository.prototype.create = function(name, extraProperties) {
	if (!this._templates[name]) {
		throw new Error(
			`No template named '${name}' in repository '${this._name}'`
		);
	}
	// Copy the template
	const template = Object.create(this._templates[name]);
	// Apply any extra properties
	if (extraProperties) {
		for (const key in extraProperties) {
			template[key] = extraProperties[key];
		}
	}
	// Create the object, passing the template as an argument
	return new this._ctor(template);
};

// Create an object based on a random template
Game.Repository.prototype.createRandom = function() {
	// Pick a random key and create an object based off of it.
	return this.create(Object.keys(this._randomTemplates).random());
};

// Player template
Game.PlayerTemplate = {
	name: "human (you)",
	character: "@",
	foreground: "white",
	maxHp: 40,
	attackValue: 10,
	sightRadius: 6,
	inventorySlots: 22,
	mixins: [
		Game.EntityMixins.PlayerActor,
		Game.EntityMixins.Attacker,
		Game.EntityMixins.Destructible,
		Game.EntityMixins.InventoryHolder,
		Game.EntityMixins.FoodConsumer,
		Game.EntityMixins.Sight,
		Game.EntityMixins.MessageRecipient,
		Game.EntityMixins.Equipper,
		Game.EntityMixins.ExperienceGainer,
		Game.EntityMixins.PlayerStatGainer
	]
};

// Create our central entity repository
Game.EntityRepository = new Game.Repository("entities", Game.Entity);

Game.EntityRepository.define("fungus", {
	name: "fungus",
	character: "F",
	foreground: "green",
	maxHp: 10,
	speed: 250,
	mixins: [
		Game.EntityMixins.FungusActor,
		Game.EntityMixins.Destructible,
		Game.EntityMixins.ExperienceGainer,
		Game.EntityMixins.RandomStatGainer
	]
});

Game.EntityRepository.define("bat", {
	name: "bat",
	character: "B",
	foreground: "white",
	maxHp: 5,
	speed: 2000,
	attackValue: 4,
	mixins: [
		Game.EntityMixins.CorpseDropper,
		Game.EntityMixins.Attacker,
		Game.EntityMixins.Destructible,
		Game.EntityMixins.CorpseDropper,
		Game.EntityMixins.TaskActor,
		Game.EntityMixins.ExperienceGainer,
		Game.EntityMixins.RandomStatGainer
	]
});

Game.EntityRepository.define("newt", {
	name: "newt",
	character: ":",
	foreground: "yellow",
	maxHp: 3,
	attackValue: 2,
	mixins: [
		Game.EntityMixins.Attacker,
		Game.EntityMixins.Destructible,
		Game.EntityMixins.CorpseDropper,
		Game.EntityMixins.TaskActor,
		Game.EntityMixins.ExperienceGainer,
		Game.EntityMixins.RandomStatGainer
	]
});

Game.EntityRepository.define("kobold", {
	name: "kobold",
	character: "k",
	foreground: "white",
	maxHp: 6,
	attackValue: 4,
	sightRadius: 5,
	tasks: ["hunt", "wander"],
	mixins: [
		Game.EntityMixins.TaskActor,
		Game.EntityMixins.Sight,
		Game.EntityMixins.Attacker,
		Game.EntityMixins.Destructible,
		Game.EntityMixins.CorpseDropper,
		Game.EntityMixins.ExperienceGainer,
		Game.EntityMixins.RandomStatGainer
	]
});

Game.EntityRepository.define(
	"giant zombie",
	{
		name: "giant zombie",
		character: "Z",
		foreground: "teal",
		maxHp: 30,
		attackValue: 8,
		defenseValue: 5,
		level: 5,
		sightRadius: 6,
		mixins: [
			Game.EntityMixins.GiantZombieActor,
			Game.EntityMixins.Sight,
			Game.EntityMixins.Attacker,
			Game.EntityMixins.Destructible,
			Game.EntityMixins.CorpseDropper,
			Game.EntityMixins.ExperienceGainer
		]
	},
	{
		disableRandomCreation: true
	}
);

Game.EntityRepository.define("slime", {
	name: "slime",
	character: "s",
	foreground: "lightGreen",
	maxHp: 10,
	attackValue: 5,
	sightRadius: 3,
	tasks: ["hunt", "wander"],
	mixins: [
		Game.EntityMixins.TaskActor,
		Game.EntityMixins.Sight,
		Game.EntityMixins.Attacker,
		Game.EntityMixins.Destructible,
		Game.EntityMixins.CorpseDropper,
		Game.EntityMixins.ExperienceGainer,
		Game.EntityMixins.RandomStatGainer
	]
});

Game.ItemRepository = new Game.Repository("items", Game.Item);

Game.ItemRepository.define("apple", {
	name: "apple",
	character: "%",
	foreground: "red",
	foodValue: 50,
	mixins: [Game.ItemMixins.Edible]
});

Game.ItemRepository.define("melon", {
	name: "melon",
	character: "%",
	foreground: "lightGreen",
	foodValue: 35,
	consumptions: 4,
	mixins: [Game.ItemMixins.Edible]
});

Game.ItemRepository.define(
	"corpse",
	{
		name: "corpse",
		character: "%",
		foodValue: 75,
		consumptions: 1,
		mixins: [Game.ItemMixins.Edible]
	},
	{
		disableRandomCreation: true
	}
);

Game.ItemRepository.define("rock", {
	name: "rock",
	character: "*",
	foreground: "white"
});

// Weapons
Game.ItemRepository.define(
	"dagger",
	{
		name: "dagger",
		character: ")",
		foreground: "gray",
		attackValue: 5,
		wieldable: true,
		mixins: [Game.ItemMixins.Equippable]
	},
	{
		disableRandomCreation: true
	}
);

Game.ItemRepository.define(
	"sword",
	{
		name: "sword",
		character: ")",
		foreground: "white",
		attackValue: 10,
		wieldable: true,
		mixins: [Game.ItemMixins.Equippable]
	},
	{
		disableRandomCreation: true
	}
);

Game.ItemRepository.define(
	"staff",
	{
		name: "staff",
		character: ")",
		foreground: "yellow",
		attackValue: 5,
		defenseValue: 3,
		wieldable: true,
		mixins: [Game.ItemMixins.Equippable]
	},
	{
		disableRandomCreation: true
	}
);

// Wearables
Game.ItemRepository.define(
	"tunic",
	{
		name: "tunic",
		character: "[",
		foreground: "green",
		defenseValue: 2,
		wearable: true,
		mixins: [Game.ItemMixins.Equippable]
	},
	{
		disableRandomCreation: true
	}
);

Game.ItemRepository.define(
	"chainmail",
	{
		name: "chainmail",
		character: "[",
		foreground: "white",
		defenseValue: 4,
		wearable: true,
		mixins: [Game.ItemMixins.Equippable]
	},
	{
		disableRandomCreation: true
	}
);

Game.ItemRepository.define(
	"platemail",
	{
		name: "platemail",
		character: "[",
		foreground: "aliceblue",
		defenseValue: 6,
		wearable: true,
		mixins: [Game.ItemMixins.Equippable]
	},
	{
		disableRandomCreation: true
	}
);

Game.ItemRepository.define("pumpkin", {
	name: "pumpkin",
	character: "%",
	foreground: "orange",
	foodValue: 50,
	attackValue: 2,
	defenseValue: 2,
	wearable: true,
	wieldable: true,
	mixins: [Game.ItemMixins.Edible, Game.ItemMixins.Equippable]
});