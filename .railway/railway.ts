import { defineRailway, github, mysql, preserve, project, service, volume } from "railway/iac";

export default defineRailway(() => {
  const MySQL = mysql("MySQL", { region: "sfo" });
  MySQL.deploy = { startCommand: "docker-entrypoint.sh mysqld --innodb-use-native-aio=0 --disable-log-bin --performance_schema=0 --innodb-buffer-pool-size=1G" };
  MySQL.networking = { privateNetworkEndpoint: "mysql" };
  const mysqlVolume = volume("mysql-volume", { alerts: { usage: { "100": {}, "80": {}, "95": {} } }, allowOnlineResize: true, region: "sfo", sizeMB: 500 });
  const resumeiqVolume = volume("resumeiq-volume", { alerts: { usage: { "100": {}, "80": {}, "95": {} } }, allowOnlineResize: true, region: "sfo", sizeMB: 500 });
  const ResumeIQ = service("ResumeIQ", {
    source: github("liangmengqi70/ResumeIQ", { checkSuites: false }),
    build: "npm run build",
    start: "npm run start",
    healthcheck: "/api/health",
    healthcheckTimeout: 300,
    preDeploy: "npm run db:init",
    replicas: { "sfo": 1 },
    networking: { privateNetworkEndpoint: "resumeiq" },
    volumeMounts: { "/app/.data": resumeiqVolume },
    env: { AI_DAILY_GLOBAL_LIMIT: preserve(), AI_DAILY_OWNER_LIMIT: preserve(), APP_ORIGIN: preserve(), AUTH_SMS_MODE: preserve(), DEEPSEEK_BASE_URL: preserve(), DEEPSEEK_MODEL: preserve(), DEEPSEEK_OCR_MODEL: preserve(), EVAL_TOOL_ENABLED: preserve(), MYSQL_DATABASE: preserve(), MYSQL_HOST: preserve(), MYSQL_PASSWORD: preserve(), MYSQL_PORT: preserve(), MYSQL_USER: preserve(), RESUMEIQ_DATA_DIR: preserve() },
  });

  return project("patient-nature", {
    resources: [ResumeIQ, MySQL, mysqlVolume, resumeiqVolume],
  });
});
