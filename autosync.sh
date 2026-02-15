#!/bin/bash

while true
do
inotifywait -r -e modify,create,delete /app

git add .
git commit -m "auto sync update $(date)"
git push origin main

done
