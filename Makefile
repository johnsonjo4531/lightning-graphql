run:
	npm i && npm run dev

test:
	npm run test

watch:
	$(MAKE) -j 2 test-watch generate-watch build-watch

generate-watch:
	npm run generate -- --watch

test-watch:
	npm run test -- --watchAll

build-watch:
	npm run build -- --watch