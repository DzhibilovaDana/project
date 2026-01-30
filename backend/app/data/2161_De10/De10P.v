module De10P (
	input button0,
	input button1,
	output diod_R,
	output diod_G
);

	assign diod_R = ~button0;
	assign diod_G = ~button1;

endmodule 