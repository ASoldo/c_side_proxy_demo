use actix_files as fs;
use actix_web::{middleware::Logger, post, web, App, HttpResponse, HttpServer, Responder};
use reqwest::Client;
use serde::Deserialize;
use std::env;

static BLOCK_MALICIOUS_SCRIPT: bool = true; // Toggle this to true or false to block/not block the script

async fn proxy_handler(client: web::Data<Client>) -> impl Responder {
    let target_url = "https://example.com"; // Replace with your actual target URL
    let res = client.get(target_url).send().await;

    match res {
        Ok(mut response) => {
            let content_type = response
                .headers()
                .get("content-type")
                .map(|v| v.to_str().unwrap_or(""))
                .unwrap_or("")
                .to_string();
            let mut body = response.text().await.unwrap_or_default();

            if content_type.contains("text/html") {
                // Log the entire response body
                println!("Full response body:\n{}", body);

                // Conditionally block the malicious script
                if BLOCK_MALICIOUS_SCRIPT
                    && body.contains(r#"<script src="/static/malicious.js"></script>"#)
                {
                    println!("Malicious script detected in response body, blocking...");
                    body = body.replace(r#"<script src="/static/malicious.js"></script>"#, "");
                // Remove the malicious script reference
                } else {
                    println!("No malicious script found in response body or blocking disabled.");
                }

                let injection = r#"<script src="/static/injected.js"></script>"#;
                body.push_str(injection);
            }

            HttpResponse::Ok().content_type(content_type).body(body)
        }
        Err(_) => HttpResponse::InternalServerError().body("Error fetching target URL"),
    }
}

#[derive(Deserialize)]
struct ScriptLog {
    src: String,
}

#[post("/log-script")]
async fn log_script(data: web::Json<ScriptLog>) -> impl Responder {
    println!("External Script Logged: {}", data.src);

    // Basic detection of suspicious scripts (e.g., from untrusted domains)
    if data.src.contains("untrusted.com") {
        println!(
            "Warning: Script from untrusted domain detected: {}",
            data.src
        );
    } else if data.src.contains(".min.js") {
        println!("Info: Minified script detected: {}", data.src);
    } else if data.src.contains("eval(") {
        println!("Warning: Script containing eval detected: {}", data.src);
    } else if data.src.contains("malicious.js") {
        println!("Warning: Malicious script detected: {}", data.src);
    }

    HttpResponse::Ok().body("Script logged")
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    env::set_var("RUST_LOG", "actix_web=info");
    env_logger::init();

    let client = Client::new();

    HttpServer::new(move || {
        App::new()
            .app_data(web::Data::new(client.clone()))
            .wrap(Logger::default())
            .service(fs::Files::new("/static", "./static").show_files_listing())
            .route("/", web::get().to(proxy_handler))
            .service(log_script) // Register the logging endpoint
    })
    .bind("127.0.0.1:8080")?
    .run()
    .await
}
