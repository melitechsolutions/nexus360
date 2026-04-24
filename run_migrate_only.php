<?php
$migOut = [];
exec("cd /home/melitec1/Nexus360 && bash run_migrate.sh 2>&1", $migOut, $migRet);
echo "Migration exit: $migRet\n";
echo implode("\n", $migOut);
?>