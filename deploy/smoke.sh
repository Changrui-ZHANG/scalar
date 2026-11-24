#!/bin/sh
# Test de fumée d'un Scalar déployé : ./deploy/smoke.sh scalar-esgi.duckdns.org
# INSECURE=1 accepte un certificat non signé (essai local, avant Let's Encrypt).
set -u

DOMAIN="${1:?usage : smoke.sh <domaine>}"
BASE="https://$DOMAIN"
CURL="curl -s --max-time 20"
[ "${INSECURE:-0}" = 1 ] && CURL="$CURL -k"

failures=0
check() {
  if [ "$2" = "$3" ]; then
    echo "ok    $1"
  else
    echo "ECHEC $1 : attendu « $3 », obtenu « $2 »"
    failures=$((failures + 1))
  fi
}

check "http redirige vers https" \
  "$($CURL -o /dev/null -w '%{redirect_url}' "http://$DOMAIN/")" "$BASE/"
check "API et base joignables" \
  "$($CURL "$BASE/api/v1/health" | grep -o '"database":"connected"')" '"database":"connected"'
check "site servi" "$($CURL -o /dev/null -w '%{http_code}' "$BASE/")" 200
check "admin servi" "$($CURL -o /dev/null -w '%{http_code}' "$BASE/admin/")" 200
check "Swagger caché en production" "$($CURL -o /dev/null -w '%{http_code}' "$BASE/api/v1/docs/")" 404
check "Piston exécute du code" \
  "$($CURL -X POST "$BASE/api/v1/executions" -H 'content-type: application/json' \
    -d '{"code":"console.log(6 * 7)"}' | grep -o '"stdout":"42\\n"')" '"stdout":"42\n"'
check "HSTS posé par l'API" \
  "$($CURL -o /dev/null -D - "$BASE/api/v1/health" | grep -ci '^strict-transport-security:' | tr -d ' ')" 1

[ "$failures" -eq 0 ] && echo "Tout est en ordre." || echo "$failures vérification(s) en échec."
exit "$failures"
