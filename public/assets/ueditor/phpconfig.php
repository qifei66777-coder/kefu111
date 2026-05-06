<?php	
return array ( 

	'DB_HOST' => 'localhost', 
	'DB_TYPE'   => 'mysql', // 数据库类型
	'DB_USER' => 'root', 
	'DB_PWD' => 'root', 
	'DB_NAME' => 'home', 
	'DB_PORT'   => '', // 端口默认3306
	'DB_PREFIX' => 'me_', 
	'TMPL_ENGINE_TYPE'      =>  'Smarty',     // 默认模板引擎 以下设置仅对使用Think模板引擎有效

	'DEFAULT_MODULE'        =>  'Admin',  // 默认模块  thinkphp3.2.3分组模式
	'DEFAULT_CONTROLLER'    => 'Index', //默认控制器

	'DB_FIELDS_CACHE'   =>  'true',//启用字段缓存
	//'APP_GROUP_PATH' => 'View', 
	'LOAD_EXT_CONFIG' => 'Verify', 
	'URL_CASE_INSENSITIVE' => true, // URL地址不区分大小写
	'URL_MODEL' => 2, //REWRITE模式
	'DB_CHARSET' => 'UTF8',  //默认字符编码
	//
	//'URL_HTML_SUFFIX'       => 'html',  // URL伪静态后缀设置 设置在前台配置文件中

	/*'URL_ROUTER_ON' => true, //配置路由简短URL地址
	'URL_ROUTE_RULES' => array( //配置路由简短URL地址
		'/^c_(\d+)$/' => 'Index/List/index?id=:1',
		':id\d' => 'Index/Show/index',
		),
*/
	);

?>       