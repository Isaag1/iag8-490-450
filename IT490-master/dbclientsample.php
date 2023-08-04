<?php
require_once('path.inc');
require_once('get_host_info.inc');
require_once('rabbitMQLib.inc');
function send_message($message){
	$client = new RabbitMQClient('dbmq.ini', 'testServer');
	if(isset($argv[1])){
		$msg =array("message"=> $argv[1], "type" => "echo");
	}
	else{
		$msg = $message;
	}

	$response = $client->send_request($msg);

	echo "client received response: " . PHP_EOL;
	print_r($response);
	echo "\n\n";

	if(isset($argv[0]))
	echo $argv[0] . " END".PHP_EOL;

	return $response;
}
