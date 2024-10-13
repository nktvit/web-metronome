self.onmessage = (event: MessageEvent<string>) => {
	console.log(event.data);
};

export {}; // this is to make typescript happy
