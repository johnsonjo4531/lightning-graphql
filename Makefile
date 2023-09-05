run:
	npm run dev

test:
	npm run test

watch:
	$(MAKE) -j 2 test-watch generate-watch

generate-watch:
	npm run generate -- --watch

test-watch:
	npm run test -- --watchAll