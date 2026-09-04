@REM ----------------------------------------------------------------------------
@REM Maven Wrapper startup batch script (simplified)
@REM Downloads/uses the Maven distribution pinned in
@REM .mvn/wrapper/maven-wrapper.properties via maven-wrapper.jar.
@REM ----------------------------------------------------------------------------
@ECHO OFF

SET ERROR_CODE=0
SETLOCAL

SET MAVEN_PROJECTBASEDIR=%~dp0
IF "%MAVEN_PROJECTBASEDIR:~-1%"=="\" SET MAVEN_PROJECTBASEDIR=%MAVEN_PROJECTBASEDIR:~0,-1%

SET WRAPPER_JAR=%MAVEN_PROJECTBASEDIR%\.mvn\wrapper\maven-wrapper.jar

SET JAVA_EXE=java.exe
IF NOT "%JAVA_HOME%"=="" SET JAVA_EXE=%JAVA_HOME%\bin\java.exe

IF NOT EXIST "%WRAPPER_JAR%" (
  ECHO Cannot find %WRAPPER_JAR% 1>&2
  ECHO Please run this project from a machine with internet access on first run, 1>&2
  ECHO or open the project in IntelliJ IDEA and let it resolve Maven automatically. 1>&2
  SET ERROR_CODE=1
  GOTO end
)

"%JAVA_EXE%" ^
  -Dmaven.multiModuleProjectDirectory="%MAVEN_PROJECTBASEDIR%" ^
  -classpath "%WRAPPER_JAR%" ^
  org.apache.maven.wrapper.MavenWrapperMain %*
IF ERRORLEVEL 1 SET ERROR_CODE=1

:end
ENDLOCAL & SET ERROR_CODE=%ERROR_CODE%
EXIT /B %ERROR_CODE%
