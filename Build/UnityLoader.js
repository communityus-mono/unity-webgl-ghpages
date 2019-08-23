var UnityLoader = UnityLoader || {
	Compression: {
		identity: {
			require: function() {
				return {};
			},
			decompress: function(data) {
				return data;
			},
			hasUnityMarker: function() {
				return false;
			}
		},
		decompress: function(compressed, callback) {
			var decompressor = this.gzip.hasUnityMarker(compressed) ? this.gzip : this.brotli.hasUnityMarker(compressed) ? this.brotli : this.identity;
			if (this.serverSetupWarningEnabled && decompressor != this.identity) {
				console.log('You can reduce your startup time if you configure your web server to host .unityweb files using ' + (decompressor == this.gzip ? 'gzip' : 'brotli') + ' compression.');
				this.serverSetupWarningEnabled = false;
			}
			if (typeof callback != 'function') {
				return decompressor.decompress(compressed);
			}
			if (!decompressor.worker) {
				var workerUrl = URL.createObjectURL(new Blob([
					'this.require = ',
					decompressor.require.toString(),
					'; this.decompress = ',
					decompressor.decompress.toString(),
					'; this.onmessage = ',
					function(e) {
						var data = {id: e.data.id, decompressed: this.decompress(e.data.compressed)};
						postMessage(data, data.decompressed ? [data.decompressed.buffer] : []);
					}.toString(),
					'; postMessage({ ready: true });'], {type: 'text/javascript'}));
				decompressor.worker = new Worker(workerUrl);
				decompressor.worker.onmessage = function(e) {
					if (e.data.ready) {
						URL.revokeObjectURL(workerUrl);
						return;
					}
					this.callbacks[e.data.id](e.data.decompressed);
					delete this.callbacks[e.data.id];
				};
				decompressor.worker.callbacks = {};
				decompressor.worker.nextCallbackId = 0;
			}
			var id = decompressor.worker.nextCallbackId++;
			decompressor.worker.callbacks[id] = callback;
			decompressor.worker.postMessage({id: id, compressed: compressed}, [compressed.buffer]);
		},
		serverSetupWarningEnabled: true,
	},
	Cryptography: {
		md5: function(code) {
			var module = UnityLoader.Cryptography.md5.module;
			if (!module) {
				var buffer = new ArrayBuffer(0x1000000);
				var asm = (function(global, env, buffer) {
					'use asm';
					var HEAPU32 = new global.Uint32Array(buffer);

					function process(data, blockCount) {
						data = data | 0;
						blockCount = blockCount | 0;
						var h0 = 0, h1 = 0, h2 = 0, h3 = 0, d0 = 0, d1 = 0, d2 = 0, d3 = 0, d4 = 0, i = 0, t = 0, s = 0;
						h0 = HEAPU32[0x80] | 0, h1 = HEAPU32[0x81] | 0, h2 = HEAPU32[0x82] | 0, h3 = HEAPU32[0x83] | 0;
						for (; blockCount; data = (data + 64) | 0, blockCount = (blockCount - 1) | 0) {
							d0 = h0;
							d1 = h1;
							d2 = h2;
							d3 = h3;
							for (i = 0; (i | 0) < 512; i = (i + 8) | 0) {
								s = (HEAPU32[i >> 2] | 0);
								h0 = (h0 + (HEAPU32[(i + 4) >> 2] | 0) + (HEAPU32[(data + (s >>> 14)) >> 2] | 0) + (
									(i | 0) < 128 ? h3 ^ (h1 & (h2 ^ h3)) :
										(i | 0) < 256 ? h2 ^ (h3 & (h1 ^ h2)) :
											(i | 0) < 384 ? h1 ^ h2 ^ h3 :
												(h2 ^ (h1 | ~h3))
								)) | 0;
								t = (((h0 << (s & 31)) | (h0 >>> (32 - (s & 31)))) + h1) | 0;
								h0 = h3;
								h3 = h2;
								h2 = h1;
								h1 = t;
							}
							h0 = (h0 + d0) | 0;
							h1 = (h1 + d1) | 0;
							h2 = (h2 + d2) | 0;
							h3 = (h3 + d3) | 0;
						}
						HEAPU32[0x80] = h0;
						HEAPU32[0x81] = h1;
						HEAPU32[0x82] = h2;
						HEAPU32[0x83] = h3;
					}

					return {process: process};
				})({Uint32Array: Uint32Array}, null, buffer);

				module = UnityLoader.Cryptography.md5.module = {
					buffer: buffer,
					HEAPU8: new Uint8Array(buffer),
					HEAPU32: new Uint32Array(buffer),
					process: asm.process,
					md5: 0x200,
					data: 0x240,
				};

				module.HEAPU32.set(new Uint32Array([
					0x00000007, 0xD76AA478, 0x0001000C, 0xE8C7B756, 0x00020011, 0x242070DB, 0x00030016, 0xC1BDCEEE,
					0x00040007, 0xF57C0FAF, 0x0005000C, 0x4787C62A, 0x00060011, 0xA8304613, 0x00070016, 0xFD469501,
					0x00080007, 0x698098D8, 0x0009000C, 0x8B44F7AF, 0x000A0011, 0xFFFF5BB1, 0x000B0016, 0x895CD7BE,
					0x000C0007, 0x6B901122, 0x000D000C, 0xFD987193, 0x000E0011, 0xA679438E, 0x000F0016, 0x49B40821,
					0x00010005, 0xF61E2562, 0x00060009, 0xC040B340, 0x000B000E, 0x265E5A51, 0x00000014, 0xE9B6C7AA,
					0x00050005, 0xD62F105D, 0x000A0009, 0x02441453, 0x000F000E, 0xD8A1E681, 0x00040014, 0xE7D3FBC8,
					0x00090005, 0x21E1CDE6, 0x000E0009, 0xC33707D6, 0x0003000E, 0xF4D50D87, 0x00080014, 0x455A14ED,
					0x000D0005, 0xA9E3E905, 0x00020009, 0xFCEFA3F8, 0x0007000E, 0x676F02D9, 0x000C0014, 0x8D2A4C8A,
					0x00050004, 0xFFFA3942, 0x0008000B, 0x8771F681, 0x000B0010, 0x6D9D6122, 0x000E0017, 0xFDE5380C,
					0x00010004, 0xA4BEEA44, 0x0004000B, 0x4BDECFA9, 0x00070010, 0xF6BB4B60, 0x000A0017, 0xBEBFBC70,
					0x000D0004, 0x289B7EC6, 0x0000000B, 0xEAA127FA, 0x00030010, 0xD4EF3085, 0x00060017, 0x04881D05,
					0x00090004, 0xD9D4D039, 0x000C000B, 0xE6DB99E5, 0x000F0010, 0x1FA27CF8, 0x00020017, 0xC4AC5665,
					0x00000006, 0xF4292244, 0x0007000A, 0x432AFF97, 0x000E000F, 0xAB9423A7, 0x00050015, 0xFC93A039,
					0x000C0006, 0x655B59C3, 0x0003000A, 0x8F0CCC92, 0x000A000F, 0xFFEFF47D, 0x00010015, 0x85845DD1,
					0x00080006, 0x6FA87E4F, 0x000F000A, 0xFE2CE6E0, 0x0006000F, 0xA3014314, 0x000D0015, 0x4E0811A1,
					0x00040006, 0xF7537E82, 0x000B000A, 0xBD3AF235, 0x0002000F, 0x2AD7D2BB, 0x00090015, 0xEB86D391,
				]));
			}

			module.HEAPU32.set(new Uint32Array([0x67452301, 0xEFCDAB89, 0x98BADCFE, 0x10325476]), module.md5 >> 2);
			for (var offset = 0; offset < code.length;) {
				var length = Math.min(module.HEAPU8.length - module.data, code.length - offset) & ~63;
				module.HEAPU8.set(code.subarray(offset, offset + length), module.data);
				offset += length;
				module.process(module.data, length >> 6);
				if (code.length - offset < 64) {
					length = code.length - offset;
					module.HEAPU8.set(code.subarray(code.length - length, code.length), module.data);
					offset += length;
					module.HEAPU8[module.data + length++] = 0x80;
					if (length > 56) {
						for (var i = length; i < 64; i++) {
							module.HEAPU8[module.data + i] = 0;
						}
						module.process(module.data, 1);
						length = 0;
					}
					for (var i = length; i < 64; i++) {
						module.HEAPU8[module.data + i] = 0;
					}
					for (var value = code.length, add = 0, i = 56; i < 64; i++, add = (value & 0xE0) >> 5, value /= 0x100) {
						module.HEAPU8[module.data + i] = ((value & 0x1F) << 3) + add;
					}
					module.process(module.data, 1);
				}
			}
			return new Uint8Array(module.HEAPU8.subarray(module.md5, module.md5 + 16));

		},

	},
	Error: {
		// stacktrace example:
		//
		// [Chrome]
		// Error
		//    at Array.eWg (blob:http%3A//localhost%3A8080/7dd54af3-48c5-47e1-893f-5f1ef09ab62b:10:238896)
		//    at Object.P7h [as dynCall_iiii] (blob:http%3A//localhost%3A8080/7dd54af3-48c5-47e1-893f-5f1ef09ab62b:28:33689)
		//    at invoke_iiii (blob:http%3A//localhost%3A8080/972f149f-a28e-4ee9-a1c7-45e8c4b0998b:1:334638)
		//    at DJd (blob:http%3A//localhost%3A8080/7dd54af3-48c5-47e1-893f-5f1ef09ab62b:15:260807)
		//    at Object.dynCall (blob:http%3A//localhost%3A8080/972f149f-a28e-4ee9-a1c7-45e8c4b0998b:1:7492)
		//    at browserIterationFunc (blob:http%3A//localhost%3A8080/972f149f-a28e-4ee9-a1c7-45e8c4b0998b:1:207518)
		//    at Object.runIter (blob:http%3A//localhost%3A8080/972f149f-a28e-4ee9-a1c7-45e8c4b0998b:1:189915)
		//
		// [Chrome WebAssembly]
		//    at  (<WASM>[24622]+70)
		//    at  (<WASM>[24000]+73)
		//
		// [Firefox]
		// eWg@blob:http://localhost:8080/0e677969-e11c-e24b-bb23-4f3afdbd5a3a:10:1
		// P7h@blob:http://localhost:8080/0e677969-e11c-e24b-bb23-4f3afdbd5a3a:28:1
		// invoke_iiii@blob:http://localhost:8080/67513e21-4cf2-de4e-a571-c6ee67cc2a72:1:334616
		// DJd@blob:http://localhost:8080/0e677969-e11c-e24b-bb23-4f3afdbd5a3a:15:1
		// Runtime.dynCall@blob:http://localhost:8080/67513e21-4cf2-de4e-a571-c6ee67cc2a72:1:7469
		// _emscripten_set_main_loop/browserIterationFunc@blob:http://localhost:8080/67513e21-4cf2-de4e-a571-c6ee67cc2a72:1:207510
		// Browser.mainLoop.runIter@blob:http://localhost:8080/67513e21-4cf2-de4e-a571-c6ee67cc2a72:1:189915
		//
		// [Firefox WebAssembly]
		// wasm-function[24622]@blob:null/2e0a79af-37a7-ac43-9534-4ac66e23fea4:8059611:1
		// wasm-function[24000]@blob:null/2e0a79af-37a7-ac43-9534-4ac66e23fea4:7932153:1
		//
		// [Safari]
		// eWg@blob:http://localhost:8080/6efe7f5a-b930-45c3-9175-296366f9d9f4:10:238896
		// P7h@blob:http://localhost:8080/6efe7f5a-b930-45c3-9175-296366f9d9f4:28:33689
		// invoke_iiii@blob:http://localhost:8080/597cffca-fc52-4586-9da7-f9c8e591738b:1:334638
		// DJd@blob:http://localhost:8080/6efe7f5a-b930-45c3-9175-296366f9d9f4:15:260809
		// dynCall@blob:http://localhost:8080/597cffca-fc52-4586-9da7-f9c8e591738b:1:7496
		// browserIterationFunc@blob:http://localhost:8080/597cffca-fc52-4586-9da7-f9c8e591738b:1:207525
		// runIter@blob:http://localhost:8080/597cffca-fc52-4586-9da7-f9c8e591738b:1:189919

		init: (function() {
			Error.stackTraceLimit = 50;
			window.addEventListener('error', function(e) {
				var Module = UnityLoader.Error.getModule(e);
				if (!Module) {
					return UnityLoader.Error.handler(e);
				}
				var debugSymbolsUrl = Module.useWasm ? Module.wasmSymbolsUrl : Module.asmSymbolsUrl;
				if (!debugSymbolsUrl) {
					return UnityLoader.Error.handler(e, Module);
				}
				var xhr = new XMLHttpRequest();
				xhr.open('GET', Module.resolveBuildUrl(debugSymbolsUrl));
				xhr.responseType = 'arraybuffer';
				xhr.onload = function() {
					UnityLoader.loadCode(UnityLoader.Compression.decompress(new Uint8Array(xhr.response)), function(id) {
						Module.demangleSymbol = UnityLoader[id]();
						UnityLoader.Error.handler(e, Module);
					});
				};
				xhr.send();
			});
			return true;
		})(),
		stackTraceFormat: navigator.userAgent.indexOf('Chrome') != -1 ? '(\\s+at\\s+)(([\\w\\d_\\.]*?)([\\w\\d_$]+)(/[\\w\\d_\\./]+|))(\\s+\\[.*\\]|)\\s*\\((blob:.*)\\)' :
			'(\\s*)(([\\w\\d_\\.]*?)([\\w\\d_$]+)(/[\\w\\d_\\./]+|))(\\s+\\[.*\\]|)\\s*@(blob:.*)',
		stackTraceFormatWasm: navigator.userAgent.indexOf('Chrome') != -1 ? '((\\s+at\\s*)\\s\\(<WASM>\\[(\\d+)\\]\\+\\d+\\))()' :
			'((\\s*)wasm-function\\[(\\d+)\\])@(blob:.*)',
		blobParseRegExp: new RegExp('^(blob:.*)(:\\d+:\\d+)$'),
		getModule: function(e) {
			var traceMatch = e.message.match(new RegExp(this.stackTraceFormat, 'g'));
			for (var trace in traceMatch) {
				var traceParse = traceMatch[trace].match(new RegExp('^' + this.stackTraceFormat + '$'));
				var blobParse = traceParse[7].match(this.blobParseRegExp);
				if (blobParse && UnityLoader.Blobs[blobParse[1]] && UnityLoader.Blobs[blobParse[1]].Module) {
					return UnityLoader.Blobs[blobParse[1]].Module;
				}
			}
		},
		demangle: function(e, Module) {
			var message = e.message;
			if (!Module) {
				return message;
			}
			message = message.replace(new RegExp(this.stackTraceFormat, 'g'), function(trace) {
				var errParse = trace.match(new RegExp('^' + this.stackTraceFormat + '$'));
				var blobParse = errParse[7].match(this.blobParseRegExp);
				var functionName = Module.demangleSymbol ? Module.demangleSymbol(errParse[4]) : errParse[4];
				var url = blobParse && UnityLoader.Blobs[blobParse[1]] && UnityLoader.Blobs[blobParse[1]].url ? UnityLoader.Blobs[blobParse[1]].url : 'blob';
				return errParse[1] + functionName + (errParse[2] != functionName ? ' [' + errParse[2] + ']' : '') +
					' (' + (blobParse ? url.substr(url.lastIndexOf('/') + 1) + blobParse[2] : errParse[7]) + ')';
			}.bind(this));
			if (Module.useWasm) {
				message = message.replace(new RegExp(this.stackTraceFormatWasm, 'g'), function(trace) {
					var errParse = trace.match(new RegExp('^' + this.stackTraceFormatWasm + '$'));
					var functionName = Module.demangleSymbol ? Module.demangleSymbol(errParse[3]) : errParse[3];
					var blobParse = errParse[4].match(this.blobParseRegExp);
					var url = blobParse && UnityLoader.Blobs[blobParse[1]] && UnityLoader.Blobs[blobParse[1]].url ? UnityLoader.Blobs[blobParse[1]].url : 'blob';
					return (functionName == errParse[3] ? errParse[1] : errParse[2] + functionName + ' [wasm:' + errParse[3] + ']') +
						(errParse[4] ? ' (' + (blobParse ? url.substr(url.lastIndexOf('/') + 1) + blobParse[2] : errParse[4]) + ')' : '');
				}.bind(this));
			}
			return message;
		},
		handler: function(e, Module) {
			var message = Module ? this.demangle(e, Module) : e.message;
			if (Module && Module.errorhandler && Module.errorhandler(message, e.filename, e.lineno)) {
				return;
			}
			console.log('Invoking error handler due to\n' + message);
			if (typeof dump == 'function') {
				dump('Invoking error handler due to\n' + message);
			}
			// Firefox has a bug where it's IndexedDB implementation will throw UnknownErrors, which are harmless, and should not be shown.
			if (message.indexOf('UnknownError') != -1) {
				return;
			}
			// Ignore error when application terminated with return code 0
			if (message.indexOf('Program terminated with exit(0)') != -1) {
				return;
			}
			if (this.didShowErrorMessage) {
				return;
			}
			var message = 'An error occurred running the Unity content on this page. See your browser JavaScript console for more info. The error was:\n' + message;
			if (message.indexOf('DISABLE_EXCEPTION_CATCHING') != -1) {
				message = 'An exception has occurred, but exception handling has been disabled in this build. If you are the developer of this content, enable exceptions in your project WebGL player settings to be able to catch the exception or see the stack trace.';
			} else if (message.indexOf('Cannot enlarge memory arrays') != -1) {
				message = 'Out of memory. If you are the developer of this content, try allocating more memory to your WebGL build in the WebGL player settings.';
			} else if (message.indexOf('Invalid array buffer length') != -1 || message.indexOf('Invalid typed array length') != -1 || message.indexOf('out of memory') != -1 || message.indexOf('could not allocate memory') != -1) {
				message = 'The browser could not allocate enough memory for the WebGL content. If you are the developer of this content, try allocating less memory to your WebGL build in the WebGL player settings.';
			}
			alert(message);
			this.didShowErrorMessage = true;

		},
		popup: function(gameInstance, message, callbacks) {
			callbacks = callbacks || [{text: 'OK'}];
			var popup = document.createElement('div');
			popup.style.cssText = 'position: absolute; top: 50%; left: 50%; -webkit-transform: translate(-50%, -50%); transform: translate(-50%, -50%); text-align: center; border: 1px solid black; padding: 5px; background: #E8E8E8';
			var messageElement = document.createElement('span');
			messageElement.textContent = message;
			popup.appendChild(messageElement);
			popup.appendChild(document.createElement('br'));
			for (var i = 0; i < callbacks.length; i++) {
				var button = document.createElement('button');
				if (callbacks[i].text) {
					button.textContent = callbacks[i].text;
				}
				if (callbacks[i].callback) {
					button.onclick = callbacks[i].callback;
				}
				button.style.margin = '5px';
				button.addEventListener('click', function() { gameInstance.container.removeChild(popup); });
				popup.appendChild(button);
			}
			gameInstance.container.appendChild(popup);

		},

	},
	Job: {
		schedule: function(Module, id, dependencies, callback, parameters) {
			parameters = parameters || {};
			var job = Module.Jobs[id];
			if (!job) {
				job = Module.Jobs[id] = {dependencies: {}, dependants: {}};
			}
			if (job.callback) {
				throw '[UnityLoader.Job.schedule] job \'' + id + '\' has been already scheduled';
			}
			if (typeof callback != 'function') {
				throw '[UnityLoader.Job.schedule] job \'' + id + '\' has invalid callback';
			}
			if (typeof parameters != 'object') {
				throw '[UnityLoader.Job.schedule] job \'' + id + '\' has invalid parameters';
			}
			job.callback = function(x, y) {
				job.starttime = performance.now();
				callback(x, y);
			};
			job.parameters = parameters;
			job.complete = function(result) {
				job.endtime = performance.now();
				job.result = {value: result};
				for (var dependant in job.dependants) {
					var dependantJob = Module.Jobs[dependant];
					dependantJob.dependencies[id] = job.dependants[dependant] = false;
					var pending = typeof dependantJob.callback != 'function';
					for (var dependency in dependantJob.dependencies) {
						pending = pending || dependantJob.dependencies[dependency];
					}
					if (!pending) {
						if (dependantJob.executed) {
							throw '[UnityLoader.Job.schedule] job \'' + id + '\' has already been executed';
						}
						dependantJob.executed = true;
						setTimeout(dependantJob.callback.bind(null, Module, dependantJob), 0);
					}
				}
			};
			var pending = false;
			dependencies.forEach(function(dependency) {
				var dependencyJob = Module.Jobs[dependency];
				if (!dependencyJob) {
					dependencyJob = Module.Jobs[dependency] = {dependencies: {}, dependants: {}};
				}
				if (job.dependencies[dependency] = dependencyJob.dependants[id] = !dependencyJob.result) {
					pending = true;
				}
			});
			if (!pending) {
				job.executed = true;
				setTimeout(job.callback.bind(null, Module, job), 0);
			}

		},
		result: function(Module, id) {
			var job = Module.Jobs[id];
			if (!job) {
				throw '[UnityLoader.Job.result] job \'' + id + '\' does not exist';
			}
			if (typeof job.result != 'object') {
				throw '[UnityLoader.Job.result] job \'' + id + '\' has invalid result';
			}
			return job.result.value;

		},

	},
	Progress: {
		Styles: {
			Dark: {
				progressLogoUrl: 'data:image/png;base64,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',
				progressEmptyUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAI0AAAASCAYAAABmbl0zAAAACXBIWXMAAAsSAAALEgHS3X78AAAATUlEQVRo3u3aIQ4AIAwEQUr4/5cPiyMVBDOj0M2mCKgkGdAwjYCudZzLOLiITYPrCdEgGkSDaEA0iAbRIBpEA6JBNHx1vnL7V4NNwxsbCNMGI3YImu0AAAAASUVORK5CYII=',
				progressFullUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAI0AAAASCAYAAABmbl0zAAAACXBIWXMAAAsSAAALEgHS3X78AAAAO0lEQVRo3u3SQREAAAjDMMC/56EB3omEXjtJCg5GAkyDaTANpsE0YBpMg2kwDaYB02AaTINpMA2Yhr8FO18EIBpZMeQAAAAASUVORK5CYII=',
			},
			Light: {
				progressLogoUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJoAAACCCAYAAAC+etHhAAAACXBIWXMAAAsSAAALEgHS3X78AAAIhUlEQVR42u2dzW3bSBTH/yFcgNIBg5wDMKccPa5ATAVxKkhUga0KbFdgdmCpglDHnFZAzsGyBHWgPYjcMIQlkm++3sy8P7AInI3tGfKnN+9rZt4cj0eIRLaVySMQudBV/4v3Hz7JE+GvAoACcA2gBLAC8Dj3h/z+9dMfaCKWyntgqfbrvpYU0LxaNBELLQZgFSP/XgW3dIq8LodlD665UgBqAU302nLYB2uh+fOWApqoWw7LC36WrtgvnwKaPanW0kzxs0wsvQsABwEtnbTD0pOFKQFUAlq8aYelIT9LV9cCWnxph9KCnxW1nyagjb+8zmoVzMeat/81Alo4flZntUJTCaZVgtRBy3G5vBOargU0fnoJ1GoF6ael2iZURghZF7AUAhqfl/EQ+YdIQGOg7xH4YmN+moDGwPn/FvkcFfwnj5MH7Y7JSzg4gE1A8/hJv/UI1gantuuP7Z9JLZ8ppTfuHINVA9i1f+4HwciP1CxaKqDdOnj4HVibAVivBSO2l+8CzMpRKYC2sGTN+harnhGMuLKsCoy6OVIAzVQ6gwLWUC7zd9cCmjvloKcz9i1QW5jpx1dwm0wtAXwV0NzoYYY/tB9YrYOFsVC06flcc12GYsRfFNB6TvwXwsPlANZwHtQa5Kr1626JVlRAm/Byng3+vKa1Di7AGsJPtWbrdtxbImhs2oauIofs0FqE2mOoT61GND1IqD4imwJ7FjFkAHDTRl6+IMvbqJdqzQ69Dwx1CVQCml3IvjLwT6hzqV9JTWwFNJ6QVZ7nozRe8voMfBQtBbR4IdOxZtUZqKgBTAEGHSuZQGZF1GpEF7xcWlKDXD4zgcxKOoNaz3wasVpUP22ZMmgxQgbopTPuJwQJYtEEMq10xmoijA1xXHlqoMUKmU4AUONUtZiiDfF3qJRAixkypfEy53RZ7EL00zKBzLs1e5y5HIpFcwRZxRAynXTGmrjUUqLhImbQTEP2lRlkOumMfj1zjqhpjjJW0GKHDJjXXNnXHvQWnpr4fdcxgpYCZAXoe0V19nbuQUtzqNhASwGyzppRtIH+PgTq95exgJYKZCXRQozVM6eKmua4jgG0VCDTsWZPMNOIGVSaIxPISLoHLZ3RwFwPP7Xr1kvbUCaQzdYC9L2i1HRG8H5aJpCRlswFEYrK8Fio+bQ8NNBMQrYPADJf6YxL8B6IH+hgQDMN2Q34ixoAVLC3UWbu8rmGh11hGSPIDswh853OOKc5aQ6TwYh10FKETGe3+ZPl+c1Jc6x9PetMIJskandGg/H2bF01E5dCG8GIFdBShSzXSGe4Cm6mWLWVz4d45QGyTi8IQ7lGOqN2NMYdLu9VeITnXftXniArEL9cpmrqkWBk7fthZB4gS0Fz27N1dbgAm7cAYCpoAhn9pfuwILszvjCL89Eygcy4Vp4syIZbADAGmkCmF01XHn93H/DKYTAyG7RcINPSk+ff3wdry+nBDEFrwL+wzVm+b87LGY1ldOmsBDaydLo7TEDWTxspj2OZHAwIbHRR+9V0pRiNZTJoAhtdC9BPFNLR8sxY7riDJrDRdQf3XazqzN9/B4NKzJQSVBeum4xGh6E4Z+VEaJ7hrplzbMPJAzw3lk4tqtuA7TPC6d74l2hhFNzkssoJY7lFIG1CJpfRAqdbeBcBgNaAXsZxlZOcsinYa2Awt/HRNGyhJIephencQWCwwLQWc19BCgk007CVgcCm0/dPPTxZNwjgEqSQQTMN220gsFWgNQ/aTjHMPTL0OSTQUoWNatVsphgU4d8Ht1M9Ndhq0A9XsXGfek5cCovQQEsRNqpVs2FJSo0PTHCgpQZbA3oHrWmrRjnr7BAyaKnBRt0TkMPsPk+KRat9PDDTB/GlApvOvoBvMJPuUMTv28UAWkqwVaCf929iCaXehLKJBbSUYFtrzEk38qNYtAae7pfPLH/iTcJ2zxC0GvRCtY5Vy4mg1r4elO0LLUzCdgdGrck9UbfXKY35UP2zbaygmYbtmSFsB9B3P1HroNQj3OuYQUsBtnvQ0x2UjgpKWsNrs6nLaxRjh41aMfiGeWUk6vHtXvd5ur4YNmbYqNfuzO3uCKbs5BO02GGjWrXbGQ5+MGUn36DFDJvO6T1TrNoCtIiz9v1gMo+/O1bYqG3fasIcFHFMu5RBixU2nTro2AYSalpjkzposcJG7e4Y20BCCQQaeCo7cQPNBmyKwZyo8zm3gSQHrZu25vCCuYBmGrYX+D8GoNZ4yQ+GrBnA5Jw0TqCZhG2B0wZl37BR5/LadUDBlZ04g2YDttLjXBqYa/umuANszjjhCJpp2F4AHFvo7j34b4/El90/1E8hwLJTX1fgq6r984sGZMMTEBX+JEZrnPJLOr7U1HTHCrTmzYc2NUHtpq25vMw3x+Px/y/ef/iEyPRjhgWzDd4/RJ/xsZ1DQQD87bn/+fvXTwHNoFQLG9UamARPZywUbXA6GowFaBniVg16q3W3zP4w5OPpjIWiHacXEbtFA+gH6dmweHm7hLo4p+wdLlQExKLxSjGYtngN3Fx60YBB2Sk10HRSDDbAc3HzXc3tBaQCms5BeqbBK2D/9rsttxeQgo9mIsUQmt6OWXDx0exqlcAcWR6tnxpocyLEULXlOKjUQAPivwmmFtB4qAGT658tBT0CGiOxuNA+FWuWMmhdwfljC10sftuO68CukLb2+PvugBKnTlaFMNMgGwEtnBfVvazFALw8AN+zEdDCXF4r/Om4yAfgcbswjfXynwlPs6PVz61/d8PMv9tyfnhi0fQsSN1bZpVn/64W0NJYZvv+XT4Az7Z/x/5GZwHN3jLb9++KAXim/bst9wcioLlRl0bpKhJqAF7Uy6aAFod/dxDQRC78uzqESQpo4ft3OwFNZNO/W7YQbkKYxF+t3CKRLUllQCSgieLRf80sS5fCDVbiAAAAAElFTkSuQmCC',
				progressEmptyUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAI0AAAASCAYAAABmbl0zAAAACXBIWXMAAAsSAAALEgHS3X78AAAAUUlEQVRo3u3aMQ4AEAxAUcRJzGb3v1mt3cQglvcmc/NTA3XMFQUuNCPgVk/nahwchE2D6wnRIBpEg2hANIgG0SAaRAOiQTR8lV+5/avBpuGNDcz6A6oq1CgNAAAAAElFTkSuQmCC',
				progressFullUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAI0AAAASCAYAAABmbl0zAAAACXBIWXMAAAsSAAALEgHS3X78AAAAQElEQVRo3u3SMREAMAgAsVIpnTvj3xlogDmR8PfxftaBgSsBpsE0mAbTYBowDabBNJgG04BpMA2mwTSYBkzDXgP/hgGnr4PpeAAAAABJRU5ErkJggg==',
			},
		},
		handler: function(gameInstance, progress) {
			if (!gameInstance.Module) {
				return;
			}
			var style = UnityLoader.Progress.Styles[gameInstance.Module.splashScreenStyle];
			var progressLogoUrl = gameInstance.Module.progressLogoUrl ? gameInstance.Module.resolveBuildUrl(gameInstance.Module.progressLogoUrl) : style.progressLogoUrl;
			var progressEmptyUrl = gameInstance.Module.progressEmptyUrl ? gameInstance.Module.resolveBuildUrl(gameInstance.Module.progressEmptyUrl) : style.progressEmptyUrl;
			var progressFullUrl = gameInstance.Module.progressFullUrl ? gameInstance.Module.resolveBuildUrl(gameInstance.Module.progressFullUrl) : style.progressFullUrl;
			var commonStyle = 'position: absolute; left: 50%; top: 50%; -webkit-transform: translate(-50%, -50%); transform: translate(-50%, -50%);';
			if (!gameInstance.logo) {
				gameInstance.logo = document.createElement('div');
				gameInstance.logo.style.cssText = commonStyle + 'background: url(\'' + progressLogoUrl + '\') no-repeat center / contain; width: 154px; height: 130px;';
				gameInstance.container.appendChild(gameInstance.logo);
			}
			if (!gameInstance.progress) {
				gameInstance.progress = document.createElement('div');
				gameInstance.progress.style.cssText = commonStyle + ' height: 18px; width: 141px; margin-top: 90px;';
				gameInstance.progress.empty = document.createElement('div');
				gameInstance.progress.empty.style.cssText = 'background: url(\'' + progressEmptyUrl + '\') no-repeat right / cover; float: right; width: 100%; height: 100%; display: inline-block;';
				gameInstance.progress.appendChild(gameInstance.progress.empty);
				gameInstance.progress.full = document.createElement('div');
				gameInstance.progress.full.style.cssText = 'background: url(\'' + progressFullUrl + '\') no-repeat left / cover; float: left; width: 0%; height: 100%; display: inline-block;';
				gameInstance.progress.appendChild(gameInstance.progress.full);
				gameInstance.container.appendChild(gameInstance.progress);
			}
			gameInstance.progress.full.style.width = (100 * progress) + '%';
			gameInstance.progress.empty.style.width = (100 * (1 - progress)) + '%';
			if (progress == 1) {
				gameInstance.logo.style.display = gameInstance.progress.style.display = 'none';
			}

		},
		update: function(Module, id, e) {
			var progress = Module.buildDownloadProgress[id];
			if (!progress) {
				progress = Module.buildDownloadProgress[id] = {
					started: false,
					finished: false,
					lengthComputable: false,
					total: 0,
					loaded: 0,
				};
			}
			if (typeof e == 'object' && (e.type == 'progress' || e.type == 'load')) {
				if (!progress.started) {
					progress.started = true;
					progress.lengthComputable = e.lengthComputable;
					progress.total = e.total;
				}
				progress.loaded = e.loaded;
				if (e.type == 'load') {
					progress.finished = true;
				}
			}
			var loaded = 0, total = 0, started = 0, computable = 0, unfinishedNonComputable = 0;
			for (var id in Module.buildDownloadProgress) {
				var progress = Module.buildDownloadProgress[id];
				if (!progress.started) {
					return 0;
				}
				started++;
				if (progress.lengthComputable) {
					loaded += progress.loaded;
					total += progress.total;
					computable++;
				} else if (!progress.finished) {
					unfinishedNonComputable++;
				}
			}
			var totalProgress = started ? (started - unfinishedNonComputable - (total ? computable * (total - loaded) / total : 0)) / started : 0;
			Module.gameInstance.onProgress(Module.gameInstance, 0.9 * totalProgress);

		},

	},
	// The Unity WebGL generated content depends on SystemInfo, therefore it should not be changed. If any modification is necessary, do it at your own risk.
	SystemInfo: (function() {
		var unknown = '-';
		var nVer = navigator.appVersion;
		var nAgt = navigator.userAgent;
		var browser = navigator.appName;
		var version = navigator.appVersion;
		var majorVersion = parseInt(navigator.appVersion, 10);
		var nameOffset, verOffset, ix;
		if ((verOffset = nAgt.indexOf('Opera')) != -1) {
			browser = 'Opera';
			version = nAgt.substring(verOffset + 6);
			if ((verOffset = nAgt.indexOf('Version')) != -1) {
				version = nAgt.substring(verOffset + 8);
			}
		} else if ((verOffset = nAgt.indexOf('MSIE')) != -1) {
			browser = 'Microsoft Internet Explorer';
			version = nAgt.substring(verOffset + 5);
		} else if ((verOffset = nAgt.indexOf('Edge')) != -1) {
			browser = 'Edge';
			version = nAgt.substring(verOffset + 5);
		} else if ((verOffset = nAgt.indexOf('Chrome')) != -1) {
			browser = 'Chrome';
			version = nAgt.substring(verOffset + 7);
		} else if ((verOffset = nAgt.indexOf('AppleWebKit')) != -1) {
			browser = 'Safari';
			version = nAgt.substring(verOffset + 7);
			if ((verOffset = nAgt.indexOf('Version')) != -1) {
				version = nAgt.substring(verOffset + 8);
			}
		} else if ((verOffset = nAgt.indexOf('Firefox')) != -1) {
			browser = 'Firefox';
			version = nAgt.substring(verOffset + 8);
		} else if (nAgt.indexOf('Trident/') != -1) {
			browser = 'Microsoft Internet Explorer';
			version = nAgt.substring(nAgt.indexOf('rv:') + 3);
		} else if ((nameOffset = nAgt.lastIndexOf(' ') + 1) < (verOffset = nAgt.lastIndexOf('/'))) {
			browser = nAgt.substring(nameOffset, verOffset);
			version = nAgt.substring(verOffset + 1);
			if (browser.toLowerCase() == browser.toUpperCase()) {
				browser = navigator.appName;
			}
		}
		if ((ix = version.indexOf(';')) != -1) {
			version = version.substring(0, ix);
		}
		if ((ix = version.indexOf(' ')) != -1) {
			version = version.substring(0, ix);
		}
		if ((ix = version.indexOf(')')) != -1) {
			version = version.substring(0, ix);
		}
		majorVersion = parseInt('' + version, 10);
		if (isNaN(majorVersion)) {
			version = '' + parseFloat(navigator.appVersion);
			majorVersion = parseInt(navigator.appVersion, 10);
		}
		else {
			version = '' + parseFloat(version);
		}
		var mobile = /Mobile|mini|Fennec|Android|iP(ad|od|hone)/.test(nVer);
		var os = unknown;
		var clientStrings = [
			{s: 'Windows 3.11', r: /Win16/},
			{s: 'Windows 95', r: /(Windows 95|Win95|Windows_95)/},
			{s: 'Windows ME', r: /(Win 9x 4.90|Windows ME)/},
			{s: 'Windows 98', r: /(Windows 98|Win98)/},
			{s: 'Windows CE', r: /Windows CE/},
			{s: 'Windows 2000', r: /(Windows NT 5.0|Windows 2000)/},
			{s: 'Windows XP', r: /(Windows NT 5.1|Windows XP)/},
			{s: 'Windows Server 2003', r: /Windows NT 5.2/},
			{s: 'Windows Vista', r: /Windows NT 6.0/},
			{s: 'Windows 7', r: /(Windows 7|Windows NT 6.1)/},
			{s: 'Windows 8.1', r: /(Windows 8.1|Windows NT 6.3)/},
			{s: 'Windows 8', r: /(Windows 8|Windows NT 6.2)/},
			{s: 'Windows 10', r: /(Windows 10|Windows NT 10.0)/},
			{s: 'Windows NT 4.0', r: /(Windows NT 4.0|WinNT4.0|WinNT|Windows NT)/},
			{s: 'Windows ME', r: /Windows ME/},
			{s: 'Android', r: /Android/},
			{s: 'Open BSD', r: /OpenBSD/},
			{s: 'Sun OS', r: /SunOS/},
			{s: 'Linux', r: /(Linux|X11)/},
			{s: 'iOS', r: /(iPhone|iPad|iPod)/},
			{s: 'Mac OS X', r: /Mac OS X/},
			{s: 'Mac OS', r: /(MacPPC|MacIntel|Mac_PowerPC|Macintosh)/},
			{s: 'QNX', r: /QNX/},
			{s: 'UNIX', r: /UNIX/},
			{s: 'BeOS', r: /BeOS/},
			{s: 'OS/2', r: /OS\/2/},
			{s: 'Search Bot', r: /(nuhk|Googlebot|Yammybot|Openbot|Slurp|MSNBot|Ask Jeeves\/Teoma|ia_archiver)/},
		];
		for (var id in clientStrings) {
			var cs = clientStrings[id];
			if (cs.r.test(nAgt)) {
				os = cs.s;
				break;
			}
		}

		var osVersion = unknown;
		if (/Windows/.test(os)) {
			osVersion = /Windows (.*)/.exec(os)[1];
			os = 'Windows';
		}
		switch (os) {
			case 'Mac OS X':
				osVersion = /Mac OS X (10[\.\_\d]+)/.exec(nAgt)[1];
				break;
			case 'Android':
				osVersion = /Android ([\.\_\d]+)/.exec(nAgt)[1];
				break;
			case 'iOS':
				osVersion = /OS (\d+)_(\d+)_?(\d+)?/.exec(nVer);
				osVersion = osVersion[1] + '.' + osVersion[2] + '.' + (osVersion[3] | 0);
				break;
		}
		return {
			width: screen.width ? screen.width : 0,
			height: screen.height ? screen.height : 0,
			browser: browser,
			browserVersion: version,
			mobile: mobile,
			os: os,
			osVersion: osVersion,
			gpu: (function() {
				var canvas = document.createElement('canvas');
				var gl = canvas.getContext('experimental-webgl');
				if (gl) {
					var renderedInfo = gl.getExtension('WEBGL_debug_renderer_info');
					if (renderedInfo) {
						return gl.getParameter(renderedInfo.UNMASKED_RENDERER_WEBGL);
					}
				}
				return unknown;
			})(),
			language: window.navigator.userLanguage || window.navigator.language,
			hasWebGL: (function() {
				if (!window.WebGLRenderingContext) {
					return 0;
				}
				var canvas = document.createElement('canvas');
				var gl = canvas.getContext('webgl2');
				if (!gl) {
					gl = canvas.getContext('experimental-webgl2');
					if (!gl) {
						gl = canvas.getContext('webgl');
						if (!gl) {
							gl = canvas.getContext('experimental-webgl');
							if (!gl) {
								return 0;
							}
						}
						return 1;
					}
					return 2;
				}
				return 2;
			})(),
			hasCursorLock: (function() {
				var e = document.createElement('canvas');
				if (e['requestPointerLock'] || e['mozRequestPointerLock'] || e['webkitRequestPointerLock'] || e['msRequestPointerLock']) {
					return 1;
				} else {
					return 0;
				}
			})(),
			hasFullscreen: (function() {
				var e = document.createElement('canvas');
				if (e['requestFullScreen'] || e['mozRequestFullScreen'] || e['msRequestFullscreen'] || e['webkitRequestFullScreen']) {
					if (browser.indexOf('Safari') == -1 || version >= 10.1) {
						return 1;
					}
				}
				return 0;
			})(),
			hasWasm: typeof WebAssembly == 'object' && typeof WebAssembly.validate == 'function' && typeof WebAssembly.compile == 'function',
		};

	})(),
	compatibilityCheck: function(gameInstance, onsuccess, onerror) {
		if (!UnityLoader.SystemInfo.hasWebGL) {
			gameInstance.popup('Your browser does not support WebGL',
				[{text: 'OK', callback: onerror}]);
		} else {
			onsuccess();
		}

	},
	Blobs: {},
	loadCode: function(code, onload, info) {
		var functionId = [].slice.call(UnityLoader.Cryptography.md5(code))
			.map(function(x) { return ('0' + x.toString(16)).substr(-2); })
			.join('');
		var script = document.createElement('script');
		var blobUrl = URL.createObjectURL(new Blob([
			'UnityLoader["' + functionId + '"]=',
			code], {type: 'text/javascript'}));
		UnityLoader.Blobs[blobUrl] = info;
		script.src = blobUrl;
		script.onload = function() {
			URL.revokeObjectURL(blobUrl);
			onload(functionId);
		};
		document.body.appendChild(script);

	},
	allocateHeapJob: function(Module, job) {
		var TOTAL_STACK = Module['TOTAL_STACK'] || 5 * 1024 * 1024;
		var TOTAL_MEMORY = Module['TOTAL_MEMORY'] || (Module['buffer'] ? Module['buffer'].byteLength : 256 * 1024 * 1024);
		var WASM_PAGE_SIZE = 64 * 1024, ASM_MEMORY_GRANULARITY = 16 * 1024 * 1024;
		var totalMemory = WASM_PAGE_SIZE;
		while (totalMemory < TOTAL_MEMORY || totalMemory < 2 * TOTAL_STACK) {
			totalMemory += totalMemory < ASM_MEMORY_GRANULARITY ? totalMemory : ASM_MEMORY_GRANULARITY;
		}
		if (totalMemory != TOTAL_MEMORY) {
			Module.printErr('increasing TOTAL_MEMORY to ' + totalMemory + ' to be compliant with the asm.js spec (and given that TOTAL_STACK=' + TOTAL_STACK + ')');
		}
		TOTAL_MEMORY = totalMemory;
		if (job.parameters.useWasm) {
			Module['wasmMemory'] = new WebAssembly.Memory({
				initial: TOTAL_MEMORY / WASM_PAGE_SIZE,
				maximum: TOTAL_MEMORY / WASM_PAGE_SIZE,
			});
			Module['buffer'] = Module['wasmMemory'].buffer;
		} else if (!Module['buffer']) {
			Module['buffer'] = new ArrayBuffer(TOTAL_MEMORY);
		} else if (Module['buffer'].byteLength != TOTAL_MEMORY) {
			Module.printErr('provided buffer should be ' + TOTAL_MEMORY + ' bytes, but it is ' + Module['buffer'].byteLength + ', reallocating the buffer');
			Module['buffer'] = new ArrayBuffer(TOTAL_MEMORY);
		}
		Module['TOTAL_MEMORY'] = Module['buffer'].byteLength;
		job.complete();

	},
	setupIndexedDBJob: function(Module, job) {
		function setupIndexedDB(idb) {
			if (setupIndexedDB.called) {
				return;
			}
			setupIndexedDB.called = true;
			Module.indexedDB = idb;
			job.complete();
		}

		try {
			var idb = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
			var testRequest = idb.open('/idbfs-test');
			testRequest.onerror = function(e) {
				e.preventDefault();
				setupIndexedDB();
			};
			testRequest.onsuccess = function() {
				testRequest.result.close();
				setupIndexedDB(idb);
			};
			setTimeout(setupIndexedDB, 1000);
		} catch (e) {
			setupIndexedDB();
		}

	},
	initWasmCache: function(Module, urlId) {
		if (!Module.cacheControl || [
			'must-revalidate',
			'immutable'].indexOf(Module.cacheControl[urlId] || Module.cacheControl['default']) == -1) {
			return;
		}
		Module.wasmCache = {
			update: function() {
				var wasm = this;
				if (wasm.cache && wasm.download && wasm.request) {
					if (wasm.cache.module && wasm.cache.md5 == wasm.download.md5) {
						wasm.request.wasmInstantiate(wasm.cache.module).then(function(result) {
							console.log('[Unity Cache] WebAssembly module \'' + wasm.cache.url + '\' successfully loaded from the indexedDB cache');
							wasm.request.callback(result);
						});
					} else {
						wasm.request.wasmInstantiate(wasm.download.binary).then(function(result) {
							wasm.cache.module = result.module;
							wasm.cache.md5 = wasm.download.md5;
							UnityLoader.UnityCache.WebAssembly.put(wasm.cache, function() {
								console.log('[Unity Cache] WebAssembly module \'' + wasm.cache.url + '\' successfully stored in the indexedDB cache');
							}, function(error) {
								console.log('[Unity Cache] WebAssembly module \'' + wasm.cache.url + '\' not stored in the indexedDB cache due to the error: ' + error);
							});
							wasm.request.callback(result.instance);
						});
					}
				}
			},
		};
		UnityLoader.UnityCache.WebAssembly.get(Module.resolveBuildUrl(Module[urlId]), function(result) {
			Module.wasmCache.cache = result;
			Module.wasmCache.update();
		});

	},
	processWasmCodeJob: function(Module, job) {
		Module.wasmBinary = UnityLoader.Job.result(Module, 'downloadWasmCode');
		if (Module.wasmCache) {
			Module.wasmCache.download = {
				binary: Module.wasmBinary,
				md5: [].slice.call(UnityLoader.Cryptography.md5(Module.wasmBinary))
					.map(function(x) { return ('0' + x.toString(16)).substr(-2); })
					.join(''),
			};
			Module.wasmCache.update();
		}
		job.complete();

	},
	processWasmFrameworkJob: function(Module, job) {
		UnityLoader.loadCode(UnityLoader.Job.result(Module, 'downloadWasmFramework'), function(id) {
			UnityLoader[id](Module);
			job.complete();
		}, {Module: Module, url: Module['wasmFrameworkUrl']});

	},
	processAsmCodeJob: function(Module, job) {
		var asm = UnityLoader.Job.result(Module, 'downloadAsmCode');
		UnityLoader.loadCode(!Math.fround ? UnityLoader.Utils.optimizeMathFround(asm) : asm, function(id) {
			Module.asm = UnityLoader[id];
			job.complete();
		}, {Module: Module, url: Module['asmCodeUrl']});

	},
	processAsmFrameworkJob: function(Module, job) {
		UnityLoader.loadCode(UnityLoader.Job.result(Module, 'downloadAsmFramework'), function(id) {
			UnityLoader[id](Module);
			job.complete();
		}, {Module: Module, url: Module['asmFrameworkUrl']});

	},
	processAsmMemoryJob: function(Module, job) {
		Module['memoryInitializerRequest'].status = 200;
		Module['memoryInitializerRequest'].response = UnityLoader.Job.result(Module, 'downloadAsmMemory');
		if (Module['memoryInitializerRequest'].callback) {
			Module['memoryInitializerRequest'].callback();
		}
		job.complete();

	},
	processDataJob: function(Module, job) {
		var data = UnityLoader.Job.result(Module, 'downloadData');
		var view = new DataView(data.buffer, data.byteOffset, data.byteLength);
		var pos = 0;
		var prefix = 'UnityWebData1.0\0';
		if (!String.fromCharCode.apply(null, data.subarray(pos, pos + prefix.length)) == prefix) {
			throw 'unknown data format';
		}
		pos += prefix.length;
		var headerSize = view.getUint32(pos, true);
		pos += 4;
		while (pos < headerSize) {
			var offset = view.getUint32(pos, true);
			pos += 4;
			var size = view.getUint32(pos, true);
			pos += 4;
			var pathLength = view.getUint32(pos, true);
			pos += 4;
			var path = String.fromCharCode.apply(null, data.subarray(pos, pos + pathLength));
			pos += pathLength;
			for (var folder = 0, folderNext = path.indexOf('/', folder) + 1; folderNext > 0; folder = folderNext, folderNext = path.indexOf('/', folder) + 1) {
				Module['FS_createPath'](path.substring(0, folder), path.substring(folder, folderNext - 1), true, true);
			}
			Module['FS_createDataFile'](path, null, data.subarray(offset, offset + size), true, true, true);
		}
		Module['removeRunDependency']('processDataJob');
		job.complete();

	},
	downloadJob: function(Module, job) {
		var xhr = job.parameters.objParameters ? new UnityLoader.UnityCache.XMLHttpRequest(job.parameters.objParameters) : new XMLHttpRequest();
		xhr.open('GET', job.parameters.url);
		xhr.responseType = 'arraybuffer';
		xhr.onload = function() { UnityLoader.Compression.decompress(new Uint8Array(xhr.response), function(decompressed) { job.complete(decompressed); }); };
		if (job.parameters.onprogress) {
			xhr.addEventListener('progress', job.parameters.onprogress);
		}
		if (job.parameters.onload) {
			xhr.addEventListener('load', job.parameters.onload);
		}
		xhr.send();

	},
	scheduleBuildDownloadJob: function(Module, jobId, urlId) {
		UnityLoader.Progress.update(Module, jobId);
		UnityLoader.Job.schedule(Module, jobId, [], UnityLoader.downloadJob, {
			url: Module.resolveBuildUrl(Module[urlId]),
			onprogress: function(e) { UnityLoader.Progress.update(Module, jobId, e); },
			onload: function(e) { UnityLoader.Progress.update(Module, jobId, e); },
			objParameters: Module.companyName && Module.productName && Module.cacheControl && (Module.cacheControl[urlId] || Module.cacheControl['default']) ? {
				companyName: Module.companyName,
				productName: Module.productName,
				cacheControl: Module.cacheControl[urlId] || Module.cacheControl['default'],
			} : null,
		});

	},
	loadModule: function(Module) {
		Module.useWasm = Module['wasmCodeUrl'] && UnityLoader.SystemInfo.hasWasm;

		if (Module.useWasm) {
			UnityLoader.initWasmCache(Module, 'wasmCodeUrl');
			UnityLoader.scheduleBuildDownloadJob(Module, 'downloadWasmCode', 'wasmCodeUrl');
			UnityLoader.Job.schedule(Module, 'processWasmCode', ['downloadWasmCode'], UnityLoader.processWasmCodeJob);
			UnityLoader.scheduleBuildDownloadJob(Module, 'downloadWasmFramework', 'wasmFrameworkUrl');
			UnityLoader.Job.schedule(Module, 'processWasmFramework', [
				'downloadWasmFramework',
				'processWasmCode',
				'setupIndexedDB'], UnityLoader.processWasmFrameworkJob);

		} else if (Module['asmCodeUrl']) {
			UnityLoader.scheduleBuildDownloadJob(Module, 'downloadAsmCode', 'asmCodeUrl');
			UnityLoader.Job.schedule(Module, 'processAsmCode', ['downloadAsmCode'], UnityLoader.processAsmCodeJob);
			UnityLoader.scheduleBuildDownloadJob(Module, 'downloadAsmMemory', 'asmMemoryUrl');
			UnityLoader.Job.schedule(Module, 'processAsmMemory', ['downloadAsmMemory'], UnityLoader.processAsmMemoryJob);
			Module['memoryInitializerRequest'] = {addEventListener: function(type, callback) { Module['memoryInitializerRequest'].callback = callback; }};
			if (Module.asmLibraryUrl) {
				Module.dynamicLibraries = [Module.asmLibraryUrl].map(Module.resolveBuildUrl);
			}
			UnityLoader.scheduleBuildDownloadJob(Module, 'downloadAsmFramework', 'asmFrameworkUrl');
			UnityLoader.Job.schedule(Module, 'processAsmFramework', [
				'downloadAsmFramework',
				'processAsmCode',
				'setupIndexedDB'], UnityLoader.processAsmFrameworkJob);

		} else {
			throw 'WebAssembly support is not detected in this browser.';
		}

		UnityLoader.scheduleBuildDownloadJob(Module, 'downloadData', 'dataUrl');
		UnityLoader.Job.schedule(Module, 'setupIndexedDB', [], UnityLoader.setupIndexedDBJob);

		Module['preRun'].push(function() {
			Module['addRunDependency']('processDataJob');
			UnityLoader.Job.schedule(Module, 'processData', ['downloadData'], UnityLoader.processDataJob);
		});

	},
	instantiate: function(container, url, parameters) {
		function instantiate(container, gameInstance) {
			if (typeof container == 'string' && !(container = document.getElementById(container))) {
				return false;
			}

			container.innerHTML = '';
			container.style.border = container.style.margin = container.style.padding = 0;
			if (getComputedStyle(container).getPropertyValue('position') == 'static') {
				container.style.position = 'relative';
			}
			container.style.width = gameInstance.width || container.style.width;
			container.style.height = gameInstance.height || container.style.height;
			gameInstance.container = container;

			var Module = gameInstance.Module;
			Module.canvas = document.createElement('canvas');
			Module.canvas.style.width = '100%';
			Module.canvas.style.height = '100%';
			Module.canvas.addEventListener('contextmenu', function(e) { e.preventDefault(); }),
				Module.canvas.id = '#canvas';
			container.appendChild(Module.canvas);

			gameInstance.compatibilityCheck(gameInstance, function() {
				var xhr = new XMLHttpRequest();
				xhr.open('GET', gameInstance.url, true);
				xhr.responseType = 'text';
				xhr.onerror = function() {
					Module.print('Could not download ' + gameInstance.url);
					if (document.URL.indexOf('file:') == 0) {
						alert('It seems your browser does not support running Unity WebGL content from file:// urls. Please upload it to an http server, or try a different browser.');
					}
				};
				xhr.onload = function() {
					var parameters = JSON.parse(xhr.responseText);
					for (var parameter in parameters) {
						if (typeof Module[parameter] == 'undefined') {
							Module[parameter] = parameters[parameter];
						}
					}

					var graphicsApiMatch = false;
					for (var i = 0; i < Module.graphicsAPI.length; i++) {
						var api = Module.graphicsAPI[i];
						if (api == 'WebGL 2.0' && UnityLoader.SystemInfo.hasWebGL == 2) {
							graphicsApiMatch = true;
						}
						else if (api == 'WebGL 1.0' && UnityLoader.SystemInfo.hasWebGL >= 1) {
							graphicsApiMatch = true;
						}
						else {
							Module.print('Warning: Unsupported graphics API ' + api);
						}
					}
					if (!graphicsApiMatch) {
						gameInstance.popup('Your browser does not support any of the required graphics API for this content: ' + Module.graphicsAPI, [{text: 'OK'}]);
						return;
					}

					container.style.background = Module.backgroundUrl ? 'center/cover url(\'' + Module.resolveBuildUrl(Module.backgroundUrl) + '\')' :
						Module.backgroundColor ? ' ' + Module.backgroundColor : '';

					// show loading screen as soon as possible
					gameInstance.onProgress(gameInstance, 0.0);

					UnityLoader.loadModule(Module);
				};
				xhr.send();
			}, function() {
				Module.printErr('Instantiation of the \'' + url + '\' terminated due to the failed compatibility check.');
			});

			return true;
		}

		function resolveURL(url) {
			resolveURL.link = resolveURL.link || document.createElement('a');
			resolveURL.link.href = url;
			return resolveURL.link.href;
		}

		var gameInstance = {
			url: url,
			onProgress: UnityLoader.Progress.handler,
			compatibilityCheck: UnityLoader.compatibilityCheck,
			Module: {
				graphicsAPI: ['WebGL 2.0', 'WebGL 1.0'],
				onAbort: function(what) {
					if (what !== undefined) {
						this.print(what);
						this.printErr(what);
						what = JSON.stringify(what);
					} else {
						what = '';
					}
					throw 'abort(' + what + ') at ' + this.stackTrace();
				},
				preRun: [],
				postRun: [],
				print: function(message) { console.log(message); },
				printErr: function(message) { console.error(message); },
				Jobs: {},
				buildDownloadProgress: {},
				resolveBuildUrl: function(buildUrl) { return buildUrl.match(/(http|https|ftp|file):\/\//) ? buildUrl : url.substring(0, url.lastIndexOf('/') + 1) + buildUrl; },
				streamingAssetsUrl: function() { return resolveURL(this.resolveBuildUrl('../StreamingAssets')); },
				wasmRequest: function(wasmInstantiate, callback) {
					if (this.wasmCache) {
						this.wasmCache.request = {
							wasmInstantiate: wasmInstantiate,
							callback: callback,
						};
						this.wasmCache.update();
					} else {
						wasmInstantiate(this.wasmBinary).then(function(result) { callback(result.instance); });
					}
				},
			},
			SetFullscreen: function() {
				if (gameInstance.Module.SetFullscreen) {
					return gameInstance.Module.SetFullscreen.apply(gameInstance.Module, arguments);
				}
			},
			SendMessage: function() {
				if (gameInstance.Module.SendMessage) {
					return gameInstance.Module.SendMessage.apply(gameInstance.Module, arguments);
				}
			},
		};

		gameInstance.Module.gameInstance = gameInstance;
		gameInstance.popup = function(message, callbacks) { return UnityLoader.Error.popup(gameInstance, message, callbacks); };
		gameInstance.Module.postRun.push(function() {
			gameInstance.onProgress(gameInstance, 1);
		});

		for (var parameter in parameters) {
			if (parameter == 'Module') {
				for (var moduleParameter in parameters[parameter]) {
					gameInstance.Module[moduleParameter] = parameters[parameter][moduleParameter];
				}
			} else {
				gameInstance[parameter] = parameters[parameter];
			}
		}

		if (!instantiate(container, gameInstance)) {
			document.addEventListener('DOMContentLoaded', function() { instantiate(container, gameInstance); });
		}

		return gameInstance;

	},
	Utils: {
		assert: function(condition, text) {
			if (!condition) {
				abort('Assertion failed: ' + text);
			}

		},
		optimizeMathFround: function(code, embeddedAsm) {
			console.log('optimizing out Math.fround calls');

			var State = {
				LOOKING_FOR_MODULE: 0,
				SCANNING_MODULE_VARIABLES: 1,
				SCANNING_MODULE_FUNCTIONS: 2,
			};
			var stateSwitchMarker = [
				'EMSCRIPTEN_START_ASM',
				'EMSCRIPTEN_START_FUNCS',
				'EMSCRIPTEN_END_FUNCS',
			];
			var froundPrefix = 'var';
			var froundMarker = 'global.Math.fround;';

			var position = 0;
			var state = embeddedAsm ? State.LOOKING_FOR_MODULE : State.SCANNING_MODULE_VARIABLES;
			var froundLast = 0;
			var froundLength = 0;

			for (; state <= State.SCANNING_MODULE_FUNCTIONS && position < code.length; position++) {
				if (code[position] == 0x2F && code[position + 1] == 0x2F && code[position + 2] == 0x20 &&
					String.fromCharCode.apply(null, code.subarray(position + 3, position + 3 + stateSwitchMarker[state].length)) === stateSwitchMarker[state]) {
					// if code at position starts with "// " + stateSwitchMarker[state]
					state++;
				} else if (state == State.SCANNING_MODULE_VARIABLES && !froundLength && code[position] == 0x3D &&
					String.fromCharCode.apply(null, code.subarray(position + 1, position + 1 + froundMarker.length)) === froundMarker) {
					// if we are at the module variable section and Math_fround name has not yet been found and code at position starts with "=" + froundMarker
					froundLast = position - 1;
					while (code[froundLast - froundLength] != 0x20) {
						froundLength++;
					} // scan back until the first space character (it is always present as at least it is a part of the previously found "// ")
					if (!froundLength || String.fromCharCode.apply(null, code.subarray(froundLast - froundLength - froundPrefix.length, froundLast - froundLength)) !== froundPrefix) {
						froundLast = froundLength = 0;
					}
				} else if (froundLength && code[position] == 0x28) {
					// if Math_fround name has been found and code at position starts with "("
					var nameLength = 0;
					while (nameLength < froundLength && code[position - 1 - nameLength] == code[froundLast - nameLength]) {
						nameLength++;
					}
					if (nameLength == froundLength) {
						var c = code[position - 1 - nameLength];
						if (c < 0x24 || (0x24 < c && c < 0x30) || (0x39 < c && c < 0x41) || (0x5A < c && c < 0x5F) || (0x5F < c && c < 0x61) || 0x7A < c) {
							// if the matched Math_fround name is not a suffix of another identifier, i.e. it's preceding character does not match [$0-9A-Z_a-z]
							for (; nameLength; nameLength--) {
								code[position - nameLength] = 0x20;
							} // fill the Math_fround name with spaces (replacement works faster than shifting back the rest of the code)
						}
					}
				}
			}
			return code;

		},

	},
	UnityCache: function() {
		var UnityCacheDatabase = {name: 'UnityCache', version: 2};
		var XMLHttpRequestStore = {name: 'XMLHttpRequest', version: 1};
		var WebAssemblyStore = {name: 'WebAssembly', version: 1};

		function log(message) {
			console.log('[UnityCache] ' + message);
		}

		function resolveURL(url) {
			resolveURL.link = resolveURL.link || document.createElement('a');
			resolveURL.link.href = url;
			return resolveURL.link.href;
		}

		function isCrossOriginURL(url) {
			var originMatch = window.location.href.match(/^[a-z]+:\/\/[^\/]+/);
			return !originMatch || url.lastIndexOf(originMatch[0], 0);
		}

		function UnityCache() {
			var cache = this;
			cache.queue = [];

			function initDatabase(database) {
				if (typeof cache.database != 'undefined') {
					return;
				}
				cache.database = database;
				if (!cache.database) {
					log('indexedDB database could not be opened');
				}
				while (cache.queue.length) {
					var queued = cache.queue.shift();
					if (cache.database) {
						cache.execute.apply(cache, queued);
					} else if (typeof queued.onerror == 'function') {
						queued.onerror(new Error('operation cancelled'));
					}
				}
			}

			try {
				var indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;

				function upgradeDatabase() {
					var openRequest = indexedDB.open(UnityCacheDatabase.name, UnityCacheDatabase.version);
					openRequest.onupgradeneeded = function(e) {
						var database = e.target.result;
						if (!database.objectStoreNames.contains(WebAssemblyStore.name)) {
							database.createObjectStore(WebAssemblyStore.name);
						}
					};
					openRequest.onsuccess = function(e) { initDatabase(e.target.result); };
					openRequest.onerror = function() { initDatabase(null); };
				}

				var openRequest = indexedDB.open(UnityCacheDatabase.name);
				openRequest.onupgradeneeded = function(e) {
					var objectStore = e.target.result.createObjectStore(XMLHttpRequestStore.name, {keyPath: 'url'});
					[
						'version',
						'company',
						'product',
						'updated',
						'revalidated',
						'accessed'].forEach(function(index) { objectStore.createIndex(index, index); });
				};
				openRequest.onsuccess = function(e) {
					var database = e.target.result;
					if (database.version < UnityCacheDatabase.version) {
						database.close();
						upgradeDatabase();
					} else {
						initDatabase(database);
					}
				};
				openRequest.onerror = function() { initDatabase(null); };
				setTimeout(openRequest.onerror, 1000);
			} catch (e) {
				initDatabase(null);
			}
		};

		UnityCache.prototype.execute = function(store, operation, parameters, onsuccess, onerror) {
			if (this.database) {
				try {
					var target = this.database.transaction([store], [
						'put',
						'delete',
						'clear'].indexOf(operation) != -1 ? 'readwrite' : 'readonly')
						.objectStore(store);
					if (operation == 'openKeyCursor') {
						target = target.index(parameters[0]);
						parameters = parameters.slice(1);
					}
					var request = target[operation].apply(target, parameters);
					if (typeof onsuccess == 'function') {
						request.onsuccess = function(e) { onsuccess(e.target.result); };
					}
					request.onerror = onerror;
				} catch (e) {
					if (typeof onerror == 'function') {
						onerror(e);
					}
				}
			} else if (typeof this.database == 'undefined') {
				this.queue.push(arguments);
			} else if (typeof onerror == 'function') {
				onerror(new Error('indexedDB access denied'));
			}
		};

		var unityCache = new UnityCache();

		function createXMLHttpRequestResult(url, company, product, timestamp, xhr) {
			var result = {
				url: url,
				version: XMLHttpRequestStore.version,
				company: company,
				product: product,
				updated: timestamp,
				revalidated: timestamp,
				accessed: timestamp,
				responseHeaders: {},
				xhr: {},
			};
			if (xhr) {
				[
					'Last-Modified',
					'ETag'].forEach(function(header) { result.responseHeaders[header] = xhr.getResponseHeader(header); });
				[
					'responseURL',
					'status',
					'statusText',
					'response'].forEach(function(property) { result.xhr[property] = xhr[property]; });
			}
			return result;
		}

		function CachedXMLHttpRequest(objParameters) {
			this.cache = {enabled: false};
			if (objParameters) {
				this.cache.control = objParameters.cacheControl;
				this.cache.company = objParameters.companyName;
				this.cache.product = objParameters.productName;
			}
			this.xhr = new XMLHttpRequest(objParameters);
			this.xhr.addEventListener("load", function() {
				var xhr = this.xhr, cache = this.cache;
				if (!cache.enabled || cache.revalidated) {
					return;
				}
				if (xhr.status == 304) {
					cache.result.revalidated = cache.result.accessed;
					cache.revalidated = true;
					unityCache.execute(XMLHttpRequestStore.name, "put", [cache.result]);
					log("'" + cache.result.url + "' successfully revalidated and served from the indexedDB cache");
				} else if (xhr.status == 200) {
					cache.result = createXMLHttpRequestResult(cache.result.url, cache.company, cache.product, cache.result.accessed, xhr);
					cache.revalidated = true;
					unityCache.execute(XMLHttpRequestStore.name, "put", [cache.result], function(result) {
						log("'" + cache.result.url + "' successfully downloaded and stored in the indexedDB cache");
					}, function(error) {
						log("'" + cache.result.url + "' successfully downloaded but not stored in the indexedDB cache due to the error: " + error);
					});
				} else {
					log("'" + cache.result.url + "' request failed with status: " + xhr.status + " " + xhr.statusText);
				}
			}.bind(this));
		};

		CachedXMLHttpRequest.prototype.send = function(data) {
			var xhr = this.xhr, cache = this.cache;
			var sendArguments = arguments;
			cache.enabled = cache.enabled && xhr.responseType == "arraybuffer" && !data;
			if (!cache.enabled) {
				return xhr.send.apply(xhr, sendArguments);
			}
			unityCache.execute(XMLHttpRequestStore.name, "get", [cache.result.url], function(result) {
				if (!result || result.version != XMLHttpRequestStore.version) {
					xhr.send.apply(xhr, sendArguments);
					return;
				}
				cache.result = result;
				cache.result.accessed = Date.now();
				if (cache.control == "immutable") {
					cache.revalidated = true;
					unityCache.execute(XMLHttpRequestStore.name, "put", [cache.result]);
					xhr.dispatchEvent(new Event('load'));
					log("'" + cache.result.url + "' served from the indexedDB cache without revalidation");
				} else if (isCrossOriginURL(cache.result.url) && (cache.result.responseHeaders["Last-Modified"] || cache.result.responseHeaders["ETag"])) {
					var headXHR = new XMLHttpRequest();
					headXHR.open("HEAD", cache.result.url);
					headXHR.onload = function() {
						cache.revalidated = ["Last-Modified", "ETag"].every(function(header) {
							return !cache.result.responseHeaders[header] || cache.result.responseHeaders[header] == headXHR.getResponseHeader(header);
						});
						if (cache.revalidated) {
							cache.result.revalidated = cache.result.accessed;
							unityCache.execute(XMLHttpRequestStore.name, "put", [cache.result]);
							xhr.dispatchEvent(new Event('load'));
							log("'" + cache.result.url + "' successfully revalidated and served from the indexedDB cache");
						} else {
							xhr.send.apply(xhr, sendArguments);
						}
					}
					headXHR.send();
				} else {
					if (cache.result.responseHeaders["Last-Modified"]) {
						xhr.setRequestHeader("If-Modified-Since", cache.result.responseHeaders["Last-Modified"]);
						xhr.setRequestHeader("Cache-Control", "no-cache");
					} else if (cache.result.responseHeaders["ETag"]) {
						xhr.setRequestHeader("If-None-Match", cache.result.responseHeaders["ETag"]);
						xhr.setRequestHeader("Cache-Control", "no-cache");
					}
					xhr.send.apply(xhr, sendArguments);
				}
			}, function(error) {
				xhr.send.apply(xhr, sendArguments);
			});
		};

		CachedXMLHttpRequest.prototype.open = function(method, url, async, user, password) {
			this.cache.result = createXMLHttpRequestResult(resolveURL(url), this.cache.company, this.cache.product, Date.now());
			this.cache.enabled = [
					"must-revalidate",
					"immutable"].indexOf(this.cache.control) != -1 && method == "GET" && this.cache.result.url.match("^https?:\/\/")
				&& (typeof async == "undefined" || async) && typeof user == "undefined" && typeof password == "undefined";
			this.cache.revalidated = false;
			return this.xhr.open.apply(this.xhr, arguments);
		};

		CachedXMLHttpRequest.prototype.setRequestHeader = function(header, value) {
			this.cache.enabled = false;
			return this.xhr.setRequestHeader.apply(this.xhr, arguments);
		};

		var xhr = new XMLHttpRequest();
		for (var property in xhr) {
			if (!CachedXMLHttpRequest.prototype.hasOwnProperty(property)) {
				(function(property) {
					Object.defineProperty(CachedXMLHttpRequest.prototype, property, typeof xhr[property] == "function" ? {
						value: function() { return this.xhr[property].apply(this.xhr, arguments); },
					} : {
						get: function() { return this.cache.revalidated && this.cache.result.xhr.hasOwnProperty(property) ? this.cache.result.xhr[property] : this.xhr[property]; },
						set: function(value) { this.xhr[property] = value; },
					});
				})(property);
			}
		}

		return {
			XMLHttpRequest: CachedXMLHttpRequest,
			WebAssembly: {
				get: function(url, callback) {
					var base = {url: resolveURL(url), version: WebAssemblyStore.version, module: null, md5: null};
					unityCache.execute(WebAssemblyStore.name, "get", [base.url], function(result) {
						callback(result && result.version == WebAssemblyStore.version ? result : base);
					}, function() {
						callback(base);
					});
				},
				put: function(result, onsuccess, onerror) {
					unityCache.execute(WebAssemblyStore.name, "put", [result, result.url], onsuccess, onerror);
				},
			},
		};
	}(),

};
