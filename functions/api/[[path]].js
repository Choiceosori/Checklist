// Cloudflare Pages로 배포했을 때 /api/* 요청을 Worker와 같은 코드로 처리합니다.
// (Workers로 배포하면 이 파일은 쓰이지 않습니다.)
import worker from '../../src/worker.js';

export const onRequest = (context) => worker.fetch(context.request, context.env);
