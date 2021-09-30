import { yesOrNo } from "./utils.js";
import { Inputs } from "./prepare.js";

export function validation(inputs: Inputs) {
	const links = yesOrNo(inputs.VALIDATE_LINKS) || false;
	const markup = yesOrNo(inputs.VALIDATE_MARKUP) || false;
	const pubrules = yesOrNo(inputs.VALIDATE_PUBRULES) || false;
	const webidl = yesOrNo(inputs.VALIDATE_WEBIDL) || false;
	return { links, markup, pubrules, webidl };
}
